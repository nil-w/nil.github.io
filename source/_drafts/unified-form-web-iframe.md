# 表单使用iframe预览方法

## 注意:

iframe无法操作表单，如: 更新表单、修改字段状态...

iframe无法操作表单，如: 更新表单、修改字段状态...

iframe无法操作表单，如: 更新表单、修改字段状态...

@葛军超 @洪斌 



两个环境的地址



https://59.227.155.32/u-form/

http://192.168.32.2:30323/u-form/





统一受理提供对接地址，已发布表单，点击复制，粘贴出来的地址就是对接地址。



![img](https://static.dingtalk.com/media/lQLPJxr7deUJra3NBiTNCzywWLCZ9IGpE8YGTyP6CllTAA_2876_1572.png)

类似结构:

```json
{
  "url": "http://192.168.32.2:30323/pc/block/1792360560071196673", //iframe地址,/pc/block/:formId
  "host": "http://192.168.32.2:30323",
  "formId": "1792360560071196673",
  "formType": "block",
  "layout": "pc"
}
```



## 使用方法

### 0.请求代理

#### 0.1开发环境

```javascript
//vue dev-server
server: {
  proxy: {
    '/u-form-api/': {
      target: '表单host',
      changeOrigin: true,
    }，
    '/u-form-sdk-api/': {
      target: '表单host',
      changeOrigin: true,
    }
  }
}
```

####0.2生产环境

```nginx
#nginx
location ^~ /u-form-api/ {
              proxy_pass https://222.143.68.52:18080;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto $scheme;

              add_header Access-Control-Allow-Origin *;
              add_header Access-Control-Allow-Credentials "true"; # 新增这一个
              add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
              add_header Access-Control-Allow-Headers 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization,X-Auth-Token,X-App-Id';

              proxy_hide_header Origin;
              proxy_hide_header Referer;
              if ($request_method = 'OPTIONS') {
                  return 204;
              }
            }
            location ^~ /u-form-sdk-api/ {
              proxy_pass https://222.143.68.52:18080;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto $scheme;

              add_header Access-Control-Allow-Origin *;
              add_header Access-Control-Allow-Credentials "true"; # 新增这一个
              add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
              add_header Access-Control-Allow-Headers 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization,X-Auth-Token,X-App-Id';

              proxy_hide_header Origin;
              proxy_hide_header Referer;
              if ($request_method = 'OPTIONS') {
                  return 204;
              }
            }
```



### 1. Iframe引入

```html
#html中引入,src开发过程中根据实际域名替换
<!DOCTYPE html>
<html>

<head>
	<meta charset="utf-8">
	<title></title>
</head>
<script>
	window.addEventListener('message', function (event) {
		if (event.data.type == 'mounted') {
			console.log('parent mounted', event)
		}
		if (event.data.type == 'error') {
			console.log('parent error', event)
		}
	}, false)
	window.onload = () => {
		const _iframe = document.getElementById('iframe')
		if (_iframe) {
			_iframe.contentWindow.postMessage({
				type: 'preview',
				params: {
					appId: 'appId',
					token: 'token',
					data: {
						businessKey: '1799294515743412225'
					},
				}
			}, 'https://59.227.155.32/u-form/')
		}
	};
</script>

<body>
	<iframe id="iframe" src="https://59.227.155.32/u-form/pc/block/1795012785961279490" width="100%" height="500"
		frameborder="0" allowfullscreen sandbox="allow-scripts allow-same-origin" />

</body>

</html>



```

### 2. basic-form组件

#### 2.1 基本使用
```html

```


#### 2.2 API说明


##### 2.2.1 表单参数

|参数|描述|必填|说明|
|---|---|---|---|
|appId| 应用ID       | 是   | 应用ID，请勿前端写死，谨防泄露！                             |
| token | 用户token    | 是   | 固定值token，请勿前端写死，谨防泄露！                        |
| data  | 表单初始数据 | 否   | 表单初始数据,传入业务主键[businessKey]实现表单数据的预览查看 |



