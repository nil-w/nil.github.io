---
title: nginx支持ssl+acme.sh定时更新证书
description: acme.sh 、nginx、https
category: nginx
tags:
  - aliyun
  - 阿里云
  - nginx
  - ssl
  - acme.sh
  - ubuntu 14.04
abbrlink: 41a22a4b
date: 2018-06-04 00:00:00
---

不废话，直接进入实战。

<!--more-->

1.安装 nginx

```
apt update
apt install nginx
```

2.配置 nginx

```
vi /etc/nginx/sites-enabled/default

server {
  listen 80;
  server_name example.com ;
  return 301 https://example.com$request_uri;
}

server {
  listen 443 ssl;

  server_name example.com;

  ssl on;
  ssl_certificate         /var/www/ssl/example.com.cer;
  ssl_certificate_key     /var/www/ssl/example.com.key;
  ssl_dhparam             /var/www/ssl/dhparam.pem;
  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
  ssl_prefer_server_ciphers on;
  ssl_ciphers EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5; #加密算法(CloudFlare 推荐的加密套件组)
  ssl_session_timeout 5m; #客户端会话缓存时间
  ssl_session_cache builtin:1000 shared:SSL:10m; #SSL 会话缓存类型和大小

  root /var/www/example/current/public;
  access_log /var/www/example/current/log/nginx.access.log;
  error_log /var/www/example/current/log/nginx.error.log info;

  error_page 500 502 503 504 /500.html;
  client_max_body_size 10M;
  keepalive_timeout 10;
}

```

3.安装 acme.sh

```
curl https://get.acme.sh | sh
source ~/.bashrc
备注:如果本地创建了.bash_profie建议把此命令加入
```

4.申请证书

```
acme.sh --issue -d example.com -w /var/www/example/current/public
备注: 命令中的目录一定是通过nginx 80端口能够访问到的位置。命令执行成功后证书会存放在 ~/.acme.sh/example.com/
```

5.设置证书，并重启 nginx

```
acme.sh --installcert -d example.com \
               --keypath       /var/www/ssl/example.com.key  \
               --fullchainpath /var/www/ssl/example.com.cer \
               --reloadcmd     "nginx -s reload"
```

6.生成 dhparam.pem 文件

```
openssl dhparam -out /var/www/ssl/dhparam.pem 2048
备注：注意观察的话，证书和dhparam.pem的目录和nginx中是保持一致的。
```

7.查看定时更换任务

```
$ crontab -l
0 0 * * * "/home/ubuntu/.acme.sh"/acme.sh --cron --home "/home/ubuntu/.acme.sh" > /dev/null
```

8.验证 acme.sh 定时更换任务

```
acme.sh --cron -f
```

9.你可能遇到的问题

[使用 acme.sh 给 Nginx 安装 Let’ s Encrypt 提供的免费 SSL 证书](https://ruby-china.org/topics/31983)
