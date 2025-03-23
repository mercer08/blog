# ubuntu 核显直通记录
## PVE版本
```` markdown
pve version 8.2.2
````
### Ubuntu 设置
```bash
# 系统版本
cat /etc/os-release

PRETTY_NAME="Ubuntu 22.04.5 LTS"
NAME="Ubuntu"
VERSION_ID="22.04"
VERSION="22.04.5 LTS (Jammy Jellyfish)"
VERSION_CODENAME=jammy
ID=ubuntu
ID_LIKE=debian
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
UBUNTU_CODENAME=jammy
```
```bash
# 内核版本
uname -ar

Linux zaler 6.8.0-52-generic #53~22.04.1-Ubuntu SMP PREEMPT_DYNAMIC Wed Jan 15 19:18:46 UTC 2 x86_64 x86_64 x86_64 GNU/Linux
```
#### APT软件源索引更新与必要工具软件安装
```bash
# ubuntu 更新软件源
sudo apt update
sudo apt install -y git build-* dkms # 必要编译工具安装

# 可选
sudo apt install -y vim
```
#### 设置环境变量
```bash
KERNEL=$(uname -r); KERNEL=${KERNEL%-generic}
echo ${KERNEL}
```

## 参考
> [虚拟核显直通](https://www.cloudstaymoon.com/2024/04/10/all-in-one-1)
> 
> [ubuntu直通核显并开启硬件解码](https://github.com/firemakergk/aquar-build-helper/blob/master/details/%E7%9B%B4%E9%80%9AIntel12%E4%BB%A3%E6%A0%B8%E6%98%BE%E7%BB%99ubuntu22%E8%99%9A%E6%8B%9F%E6%9C%BA%E5%B9%B6%E9%85%8D%E7%BD%AEjellyfin%E5%AE%9E%E7%8E%B0%E7%A1%AC%E8%A7%A3.md)