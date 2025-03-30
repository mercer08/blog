# 旁路由Debian + Dae 配置指南


## 系统环境
- Proxmox VE（PVE）环境，v8.2，未进行网卡直通
- Debian 12 （uname -srm：Linux 6.1.0-32-amd64 x86_64）
- 作为旁路由使用，主路由 ikuai 设置设备基于 debian 作为网关控制分流


## Dae脚本
### 安装脚本
```shell
sudo sh -c "$(wget -qO- https://cdn.jsdelivr.net/gh/daeuniverse/dae-installer/installer.sh)" @ install use-cdn
```

### RC Release安装脚本
```shell
sudo sh -c "$(wget -qO- https://cdn.jsdelivr.net/gh/daeuniverse/dae-installer/installer.sh)" @ install-prerelease use-cdn
```

### 卸载脚本
```shell
sudo sh -c "$(curl -sL https://raw.githubusercontent.com/daeuniverse/dae-installer/main/uninstaller.sh)"
```

安装完成后，二进制执行文件位于 `/usr/local/bin/dae` ，同时会自动添加systemctl执行脚本；
配置文件位于 `/usr/local/etc/dae/config.dae`
### 更新GeoIP与GeoSite数据库
#### 更新GEOIP
```shell
sudo sh -c "$(wget -qO- https://cdn.jsdelivr.net/gh/daeuniverse/dae-installer/installer.sh)" @ update-geoip use-cdn
```
#### 更新GEOSITE
```shell
sudo sh -c "$(wget -qO- https://cdn.jsdelivr.net/gh/daeuniverse/dae-installer/installer.sh)" @ update-geosite use-cdn

```
更新后的GeoIP与GeoSite文件位于`/usr/local/share/dae` 文件夹内，Dae会自动使用该位置的GeoIP与GeoSite数据库文件，无需进行移动或复制至新的位置。

## Dae配置文件
Dae的配置文件很简单，而且可读性也很高，不必考虑乱七八糟的防火墙劫持与DNS劫持，在我的网络环境下，对付ISP的劫持反诈的劫持也有很好的效果。
以下面Dae配置为例，需要修改的部分为global部分lan_interface的网卡名称、subscription 内的订阅地址，group部分的节点过滤规则。这套配置目前使用于旁路网关上，支持IPv6，同时ipleak超过300次检测未发现DNS泄露情况。

```yaml
global {
    log_level: warn
    tproxy_port: 12345
    allow_insecure: false
    check_interval: 30s
    check_tolerance: 50ms
    # lan_interface: 网卡名称
    wan_interface: auto
    udp_check_dns:'dns.google.com:53,8.8.8.8,2001:4860:4860::8888'
    tcp_check_url: 'http://cp.cloudflare.com,1.1.1.1,2606:4700:4700::1111'
    dial_mode: domain
    tcp_check_http_method: HEAD
    disable_waiting_network: true
    auto_config_kernel_parameter: true
    sniffing_timeout: 100ms
    tls_implementation: tls
    utls_imitate: chrome_auto
    tproxy_port_protect: true
    so_mark_from_dae: 0
}

subscription {
    my_sub: '你的订阅地址'
}

dns {
  upstream {
    googledns: 'tcp+udp://dns.google:53'
    alidns: 'udp://dns.alidns.com:53'
  }
  routing {
    # 根据 DNS 查询，决定使用哪个 DNS 上游。
    # 按由上到下的顺序匹配。
    request {
      # 对于中国大陆域名使用 alidns，其他使用 googledns 查询。
      qname(geosite:cn) -> alidns
      # 属于广告的一些解析，全拒绝解析
      qname(geosite:category-ads) -> reject
      qname(geosite:category-ads-all) -> reject
      # fallback 意为 default。
      fallback: googledns
    }
  }
}

group {
    proxy {
        policy: min_moving_avg
        filter: subtag(my_sub) && name(keyword: '香港家宽')
    }

    sg {
        policy: min_moving_avg
        filter: subtag(my_sub) && name(keyword: '新加坡家宽')
    }
}

routing {
    pname(NetworkManager) -> direct
    dip(224.0.0.0/3, 'ff00::/8') -> direct
    dscp(4) -> direct

    dip(geoip:private) -> direct
    
    ### OpenAI
    domain(geosite:openai) -> proxy

    ### AppleCN
    domain(geosite:apple@cn) -> direct

    ### SteamCN
    domain(geosite:steam@cn) -> direct

    ### telegram
    dip(geoip:telegram) -> proxy

    ### WX DOMAIN
    domain(geosite:tencent) -> direct

    ### Github
    domain(geosite:github) -> proxy

    ### Docker
    domain(geosite:docker) -> proxy

    ### DIRECT MACHINE
    # mac("BC:24:11:XX:XX:XX") -> direct
    
    ### Game
    domain(geosite: category-games@cn) -> direct

    ### Write your rules below.
    ### 如果使用小米路由器，配置放行，避免内存泄露
    domain(suffix: miwifi.com) -> direct(must)
    ### 小米系统更新CDN
    domain(suffix: cdn.pandora.xiaomi.com) -> direct(must)
    ### 小米电视
    domain(suffix: tv.global.mi.com) -> direct(must)

    ### 禁用Quic，避免CPU高负载及内存泄露
    l4proto(udp) && dport(443) -> block
    domain(geosite:geolocation-!cn) -> proxy
    dip(geoip:cn) -> direct
    domain(geosite:china-list) -> direct
    domain(geosite:cn) -> direct

    fallback: proxy
}
```
### 需要注意的部分：
- `Group` 内节点组名称需要与 `Routing` 中规则名称对应，例如修改了节点组 `Proxy` 的名称，那么在 `Routing` 中也需要修改 `proxy` 为新的名称
- 如果使用RC版本，DNS可以使用DOH或DOT，支持H3协议的DOH，以阿里巴巴的阿里云DNS举例：
  - DOH: `h3://dns.alidns.com:443`
  - DOT: `tls://dns.alidns.com:853`
  - DOQ: `quic://dns.alidns.com:853`
- 节点过滤规则：如果使用固定节点，`policy: fixed(0)` 并且 `filter: name(节点名称)`，如果节点名称中包括emoji符号，可能无法正常选择提示报错，此时建议使用 `filter: name(keyword: ‘节点关键字’)` 方式进行过滤选择。
- `Routing` 中的规则为顺序匹配，从上至下，所以建议将特定规则放在最上方，将例如 `Geosite:CN` 等较大的规则集放在下方，避免规则冲突无法正常匹配。例如，你可以将自定义规则放置于最上方。
- 在DNS服务商的选择上，可以参考 [《🗒️国内外DNS推荐列表》](https://deeprouter.org/article/dns-servers-guide)

## 启用 Dae
systemctl 启用 \
`systemctl start Dae`

前台启动 Dae，方便查看 Dae 运行情况\
`前台使用Dae，便于查看Dae运行情况，可以使用：`

修改配置文件后，需要重载Dae配置文件时，可以使用: 
`/usr/local/bin/dae reload`

## Dae自动更新并存储订阅
由于Dae每次启动时均需要重新读取订阅信息，本身并不存取订阅信息，当订阅链接被墙或者无法访问时，就无法正常获取到订阅信息及分组信息，造成访问异常。以下方法可以实现订阅信息存储和自动订阅更新。
### systemd.timer方法
假设你的dae配置文件存储于`/usr/local/etc/dae/` ，这也是通过自动安装脚本默认的存储位置。那么新建一个`/usr/local/bin/update-dae-subs.sh`文件:
```bash
#!/bin/bash

# Change the path to suit your needs
cd /usr/local/etc/dae || exit 1
version="$(dae --version | head -n 1 | sed 's/dae version //')"
UA="dae/${version} (like v2rayA/1.0 WebRequestHelper) (like v2rayN/1.0 WebRequestHelper)"
fail=false

while IFS=':' read -r name url
do
        curl --retry 3 --retry-delay 5 -fL -A "$UA" "$url" -o "${name}.sub.new"
        if [[ $? -eq 0 ]]; then
                mv "${name}.sub.new" "${name}.sub"
                chmod 0600 "${name}.sub"
                echo "Downloaded $name"
        else
                if [ -f "${name}.sub.new" ]; then
                        rm "${name}.sub.new"
                fi
                fail=true
                echo "Failed to download $name"
        fi
done < sublist

dae reload

if $fail; then
        echo "Failed to update some subs"
        exit 2
fi
```
赋予这个文件可执行权限：
```shell
chmod +x /usr/local/bin/update-dae-subs.sh
```
配置 `systemd.timer` 和 `systemd.service` 进行自动更新
  - `/etc/systemd/system/update-subs.timer`: 以下代码是每12小时，或者每次系统启动后15分钟更新
    ```shell
    [Unit]
    Description=Auto-update dae subscriptions

    [Timer]
    OnBootSec=15min
    OnUnitActiveSec=12h

    [Install]
    WantedBy=timers.target
    ```
  - /etc/systemd/system/update-subs.service:
    ```shell
    [Unit]
    Description=Update dae subscriptions
    Wants=network-online.target
    After=network-online.target

    [Service]
    Type=oneshot
    ExecStart=/usr/local/bin/update-dae-subs.sh
    Restart=on-failure
    ```
新建订阅链接文件：`/usr/local/etc/dae/sublist` ，并安装以下模板填写订阅链接，如果只有一个订阅，则保留并填写一个即可。当通过`update-subs.timer` 拉取订阅信息时，会自动建立`sub1`、`sub2`、`sub3` 的订阅文件。
```yaml
sub1:https://mysub1.com
sub2:https://mysub2.com
sub3:https://mysub3.com
```
赋予订阅链接文件 `600` 权限
```shell
chmod 0600 /usr/local/etc/dae/sublist
```
修改 `config.dae` 中 `subscription` 部分内容为订阅文件
```yaml
subscription {
    # Add your subscription links here.
    sub1:'file://sub1.sub'
    sub2:'file://sub2.sub'
    sub3:'file://sub3.sub'
}
```
启动Timer
```shell
systemctl enable --now update-dae-subs.timer

# If you need to renew your subscription immediately or haven't pulled a subscription before
systemctl start update-dae-subs.service
```

## 关于Dae的CPU占用率高及内存泄露
建议添加如下规则禁止Quic。Daed也建议添加该规则。
```javascript
l4proto(udp) && dport(443) -> block
```
同时建议添加机场节点域名至Direct规则内，避免回环产生的内存泄露。


## 参考链接
> - [官方 Github](https://github.com/daeuniverse/dae/tree/main/docs/zh)
> - [Dae安装及配置指南](https://deeprouter.org/article/dae-installation-configuration-guide)
> - [Dae搭配AdGuard Home使用指南](https://deeprouter.org/article/dae-adguard-home-guide)
> - [DAE搭配MosDNS使用配置](https://deeprouter.org/article/daed-with-mosdns)