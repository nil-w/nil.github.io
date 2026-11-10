# 表单SDK native js 使用方法


## 引入本地包

```shell
<script src="./index.iife.js"></script>
```


## 使用方法

### 0.请求代理

#### 0.1开发环境

```javascript
//vue dev-server
server: {
  proxy: {
    '/u-form-api/': {
        target: 'https://222.143.68.52:18080/',
        changeOrigin: true,
      },
      '/u-form-sdk-api/': {
        target: 'https://222.143.68.52:18080/',
        changeOrigin: true,
      },
  }
}
```

####0.2nginx 开发环境

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



### 1. html 编写

```html
<html>
<meta http-equiv="content-type" content="text/html;charset=utf-8" />

<head>
    <script src="./index.iife.js"></script>
    <script>

        const { startForm, basicExecute, submit, reset, modifyFields, getAllFields, basicListener } = MyComponents;

        //默认参数，不要更改
        startForm({
            'clear-data': true,
            destroy: true,
            disableScopecss: false,
            'disable-patch-request': true,
        });


        const FormEventType = {
            FIELD_CHANGE: "onFieldChange",
            SUBMIT_SUCCESS: "onSubmitSuccess",
            SUBMIT_FAILED: "onSubmitFailed"
        };


        function handleDataChange(res) {
            const { type, data } = res || {}
            switch (type) {
                case FormEventType.FIELD_CHANGE:
                    console.log("字段修改回调  fieldChange", data);
                    break;
                case FormEventType.SUBMIT_SUCCESS:
                    console.log("提交成功回调  submitSuccess", data);
                    break;
                case FormEventType.SUBMIT_FAILED:
                    console.log("提交失败 submitFailed", data);
                    break;
            }
        }


        //初始化参数
        const initData = {
            "formId": "xxx",
            appId: 'xxx',
            token: 'xxx',
            data: {
                businessKey: 'xxx', 
                // readOnly: false
            }
        }


        function handleSubmit() {
            console.log('submit')
            submit(initData.formId)
        }

        function handleReset() {
            console.log('rest')
            reset(initData.formId)
        }

        function handleModify() {
            console.log('modify')
            modifyFields(initData.formId, {
                '88qtgremife': {
                    display: "hidden",
                },
                'yqdjmfq8002': {
                    display: "hidden",
                }
            });
            getAllFields(initData.formId, (fields) => {
                console.log(fields)
            })
        }


        window.onload = () => {
            //初始化操作
            basicExecute(`form-${initData.formId}`, initData)
            //回调监听
            basicListener(`form-${initData.formId}`, handleDataChange)
        }







    </script>
</head>

<body>
    <!---
			以下参数固定格式，不要修改
			name: `form-${initData.formId}` 
			url:  https://222.143.68.52:18080/u-form/pc/ 
            default-page: `/block/${init.formId}`
		--->
    <micro-app iframe clear-data destroy name='form-1800808251776901122' url='https://222.143.68.52:18080/u-form/pc/'
        default-page="/block/1800808251776901122"></micro-app>

    <div>
        <button onclick="handleSubmit()">提交表单</button>
        <button onclick="handleReset()">重置</button>
        <button onclick="handleModify()">修改字段</button>
    </div>
</body>

</html>

```

### 2. API说明


##### 2.1 表单参数

| 参数   | 描述         | 必填 | 说明                                                         |
| ------ | ------------ | ---- | ------------------------------------------------------------ |
| appId  | 应用ID       | 是   | 应用ID                                                       |
| token  | 用户token    | 是   | 固定值token                                                  |
| formId | 表单ID       | 是   | 表单ID                                                       |
| data   | 表单初始数据 | 否   | 表单初始数据,如果为空,则使用表单默认值，传入业务主键[businessKey],增加[readOnly]参数设置表单是否只读 ，true只读，false可编辑； |


##### 2.2.2 表单方法

```js
import {submit,reset,modifyFields,getAllFields} from 'unified-form-web-sdk'

// 表单提交方法,提交后有submitSuccess、submitFailed接收返回数据;
submit(this.formId)

// 表单重置方法,重置无返回值;
reset(this.formId)


// 版式文件导出；
// @return [{key: '字段名'，title: '字段名称+组件名称'}]
getAllFields(this.formId, (fields)=>{
  console.log(fields)
})


// 修改表单字段状态，可用于修改显隐、初始值等状态;
modifyFields(this.formId,{
   a: {
      display: 'hidden'，
     dataSource: []
   },
   b: {
      display: 'none'
   }
})
```


##### 2.2.3 表单可修改状态参数



| 参数         | 描述       | 说明                                                       |
| ------------ | ---------- | ---------------------------------------------------------- |
| title        | 字段标题   | 字符串                                                     |
| description  | 字段描述   | 字符串                                                     |
| editable     | 是否可编辑 | true:可编辑,false:不可编辑                                 |
| readOnly     | 是否只读   | true:只读,false:可编辑                                     |
| disabled     | 是否禁用   | true:禁用,false:可编辑                                     |
| hidden       | 是否隐藏   | true:隐藏,false:显示                                       |
| visible      | 是否显示   | true:显示,false:隐藏                                       |
| value        | 初始值     | 初始值,如果为空,则使用表单默认值                           |
| dataSource   | 组件数据源 | 组件数据源,如果为空,则使用表单默认值                       |
| initialValue | 初始值     | 初始值,如果为空,则使用表单默认值                           |
| required     | 是否必填   | true:必填,false:非必填                                     |
| loading      | 是否加载中 | true:加载中,false:加载完成                                 |
| display      | 是否显示   | 'none':销毁组件 、 'hidden': 隐藏组件  'visible': 显示组件 |



