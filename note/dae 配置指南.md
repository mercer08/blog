# 旁路由Debian + Dae + Sing-box 配置指南


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
    lan_interface: ens18
    wan_interface: auto
    udp_check_dns:'dns.google.com:53,8.8.8.8,2001:4860:4860::8888'
    tcp_check_url: 'http://cp.cloudflare.com,1.1.1.1,2606:4700:4700::1111'
    dial_mode: domain
    tcp_check_http_method: HEAD
    disable_waiting_network: true
    auto_config_kernel_parameter: true
    sniffing_timeout: 100ms
    tls_implementation: utls
    utls_imitate: chrome_auto
    tproxy_port_protect: true
    so_mark_from_dae: 0
}

subscription {
    # my_sub: '订阅地址'
}

node {
  # sing box inbound port
  'socks5://localhost:1080'
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
      qname(geosite:category-ads) -> block
      qname(geosite:category-ads-all) -> block
      # fallback 意为 default。
      fallback: googledns
    }
  }
}

group {
  elden_proxy {
    policy: fixed(0)
  }
}

routing {
    pname(NetworkManager) -> direct
    dip(224.0.0.0/3, 'ff00::/8') -> direct
    
    ### AppleCN
    domain(geosite:apple@cn) -> direct

    ### WX DOMAIN
    domain(geosite:tencent) -> direct

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

    # 禁用 h3，因为它通常消耗很多 CPU 和内存资源
    l4proto(udp) && dport(443) -> block
    dip(geoip:private) -> direct
    dip(geoip:cn) -> direct
    domain(geosite:cn) -> direct
    domain(geosite:china-list) -> direct

    pname(sing-box) -> must_direct
    
    fallback: elden_proxy
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
`/usr/local/bin/dae`

修改配置文件后，需要重载Dae配置文件时，可以使用: 
`/usr/local/bin/dae reload`


## 关于Dae的CPU占用率高及内存泄露
建议添加如下规则禁止Quic。Daed也建议添加该规则。
```javascript
l4proto(udp) && dport(443) -> block
```
同时建议添加机场节点域名至Direct规则内，避免回环产生的内存泄露。


## 下游 sing-box 配置
```json
{
    "inbounds": [
        {
            "type": "socks",
            "tag": "socks-in",
            "listen": "::",
            "listen_port": 1080,
            "tcp_fast_open": true,
            "tcp_multi_path": false,
            "udp_fragment": true,
            "sniff": false,
            "sniff_override_destination": false,
            "sniff_timeout": "300ms",
            "udp_timeout": 300
        }
    ],
    "outbounds": [
      {
            "tag": "proxy",
            "type": "selector",
            "outbounds": [
                "auto",
                "direct",
                "日本实验性 IEPL 中继 1",
                
            ]
        },
      {
            "tag": "日本实验性 IEPL 中继 1",
            "type": "trojan",
            "server": "xxx",
            "server_port": xxx,
            "password": "xxx",
            "tls": {
                "enabled": true,
                "server_name": "m.ctrip.com",
                "insecure": true
            }
        },
    ],
    "route": {
        "auto_detect_interface": true,
        "final": "proxy"
    },
    "experimental": {
        "clash_api": {
            "external_controller": "0.0.0.0:9090",
            "external_ui": "metacubexd",
            "external_ui_download_url": "https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
            "external_ui_download_detour": "select",
            "default_mode": "rule"
        }
    }
}
```


## 参考链接
> https://github.com/daeuniverse/dae/tree/main/docs/zh
> 
> https://deeprouter.org/article/dae-installation-configuration-guide