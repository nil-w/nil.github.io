# 表单SDK使用方法


## 安装本地包

```shell
cd path/unified-form-web-sdk
# 链接SDK到全局 取消使用 npm unlink
npm link
# 回到自己项目目录下 取消使用 npm unlink "unified-form-web-sdk"
npm link "unified-form-web-sdk"
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



### 1. vue 全局引入

```typescript
#main.js中引入
import { startForm } from 'unified-form-web-sdk'
import FormComp from 'unified-form-web-sdk';


#省略 vue初始化
app.use(FormComp);

//在挂载之前启动表单配置
startForm({
  'clear-data': true,
  destroy: true,
  disableScopecss: false,
  'disable-patch-request': true,
});
app.mount('#app')

```

### 2. basic-form组件

#### 2.1 基本使用
```html
<template>
    <div class="container">
        <basic-form
          :host="host"
          :appId="appId"
          :token="token"
          :formId="formId"
          :formType="formType"
          :layout="layout"
          @fieldChange="handleFieldChange"
          @submitSuccess="handleSubmitSuccess"
          @submitFailed="handleSubmitFailed"
          @stepChange="handleStepChange"
          @mounted="handleMounted"
          @created="handleCreated"
          @exportPdfError="handleExportPdfError"
          @exportPdfSuccess="handleExportPdfSuccess"
          :data="data"
        />
    </div>
    <div>
        <button @click="handlePrevStep">上一步</button>
            <button @click="handleSubmit">提交表单</button>
            <button @click="handleReset">重置</button>
            <button @click="handleNextStep">下一步</button>
            <button @click="handlePrint">打印</button>
            <button @click="handleModify">修改字段</button>
            <button @click="handleExportPdf">导出pdf</button>
    </div>
</template>
<script lang="ts">
import {submit,reset,prevStep,nextStep,modifyFields,print,exportPdf,setReadOnly,getAllFields} from 'unified-form-web-sdk'
export default {
    name: 'App',
    data() {
        return {
            host: 'http://localhost:9000/',
            appId: 'appid',
            token: 'token',
            formId: '1740207410615730178',
            formType: 'block',
            layout: 'pc',
            data: {
                type: '初始化form',
              	businessKey: '业务主键',
              readOnly: true/false
            }
        }
    },
  created(){
    getAllFields(this.formId,(fields)=>{
        console.log(fields)
    })
  },
    methods: {
        handleSubmit() {
            submit(this.formId)
        },
        handleReset() {
            reset(this.formId)
        },
      	handleSubmitSuccess(data){
            console.log(data)
        },
        handleSubmitFailed(data){
            console.log(data)
        },
        handleStepChange(data){
            console.log(data)
        },
        handlePrevStep() {
            prevStep(this.formId)
        },
        handleNextStep() {
            nextStep(this.formId)
        },
      	handlePrint() {
            print(this.formId, {
                layoutId: '1787300860055195650',
                businessKey: '1787301280622252034'
            })
        },
        handleFieldChange(e) {
            console.log('fieldChange',e)
        },
        handleCreated() {
            console.log('created')
        },
        handleMounted() {
            console.log('mounted')
        },
        handleUnmounted() {
            console.log('unmounted')
        },
        handleBeforeMount() {
            console.log('beforeMount')
        },
        handleError() {
            console.log('error')
        },
        handleModify(){
            modifyFields(this.formId,{
               a: {
                display: 'hidden'
               },
               b: {
                  display: 'none'
               }
            })

            setTimeout(()=>{
                modifyFields(this.formId,{a: {
                display: 'visible',
                value: '123333'
            },b: {
                display: 'visible',
                value: '123333'
            }})
            })
        },
      handleExport() {
            exportPdf(this.formId, {
                layoutId: '1787300860055195650',
                businessKey: '1787301280622252034'
            })
        },
        handleExportPdfSuccess(data) {
            console.log("success", data);
        },
        handleExportPdfError(data) {

            console.log("error", data);
        },

    }
}
</script>
<style>
.container{
    width: 100%;
    height: 500px;
}
</style>

```


#### 2.2 API说明


##### 2.2.1 表单参数

|参数|描述|必填|说明|
|---|---|---|---|
|host|表单服务地址|是|表单服务地址|
|appId|应用ID|是|应用ID|
|token|用户token|是|固定值token|
|formId|表单ID|是|表单ID|
|formType|表单类型|是|sdk只支持单表单[block]和聚合表单[aggregate]|
|layout|布局类型|是|pc:pc端,app:移动端,pc和移动端的样式不一样,pc默认自适应移动端|
| data          | 表单初始数据       | 否   | 表单初始数据,如果为空,则使用表单默认值，传入业务主键[businessKey],增加[readOnly]参数设置表单是否只读 ，true只读，false可编辑； |
| fieldChange   | 表单字段值变化回调 | 否   | 表单字段状态变化回调,参数为字段变化的值和字段名              |
| submitSuccess | 表单提交成功回调   | 否   | 表单提交成功后返回数据                                       |
| submitFailed  | 表单提交失败回调   | 否   | 表单提交失败后返回数据                                       |
| exportPdfErr | 导出pdf失败 | 否 | 导出版式文件为pdf失败 |
| exportPdfSuccess | 导出pdf成功 | 否 | 导出版式文件为pdf成功 |
| stepChange    | 聚合表单步骤回调   | 否   | 返回分步数据和步骤索引                                       |
| mounted       | 表单挂载回调       | 否   | 表单挂载回调,参数为表单实例                                  |
| created       | 表单创建回调       | 否   | 表单创建回调,参数为表单实例                                  |
| unmounted     | 表单卸载回调       | 否   | 表单卸载回调,参数为表单实例                                  |
| error         | 表单错误回调       | 否   | 表单错误回调,参数为错误信息                                  |
|               |                    |      |                                                              |


##### 2.2.2 表单方法

```js

import {submit,reset,prevStep,nextStep,modifyFields,print,exportPdf,setReadOnly,getAllFields} from 'unified-form-web-sdk'

// 表单提交方法,提交后有submitSuccess、submitFailed接收返回数据;
submit(this.formId)

// 表单重置方法,重置无返回值;
reset(this.formId)

// 聚合表单上一步方法,上一步成功返回表单索引和表单数据,上一步失败无返回值;
prevStep(this.formId)

// 聚合表单下一步方法,下一步成功返回表单索引和表单数据,下一步失败无返回值;
nextStep(this.formId)

// 版式文件打印；
// @layoutId 版式ID
// @businessKey 数据ID
print(this.formId, {
                layoutId: '1787300860055195650',
                businessKey: '1787301280622252034'
            })

// 版式文件导出；
// @layoutId 版式ID
// @businessKey 数据ID
exportPdf(this.formId, {
                layoutId: '1787300860055195650',
                businessKey: '1787301280622252034'
            })

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



|参数|描述|说明|
|---|---|---|
|title|字段标题|字符串|
|description|字段描述|字符串|
|editable|是否可编辑|true:可编辑,false:不可编辑|
|readOnly|是否只读|true:只读,false:可编辑|
|disabled|是否禁用|true:禁用,false:可编辑|
|hidden|是否隐藏|true:隐藏,false:显示|
|visible|是否显示|true:显示,false:隐藏|
|value|初始值|初始值,如果为空,则使用表单默认值|
|dataSource|组件数据源|组件数据源,如果为空,则使用表单默认值|
|initialValue|初始值|初始值,如果为空,则使用表单默认值|
|required|是否必填|true:必填,false:非必填|
|loading|是否加载中|true:加载中,false:加载完成|
|display|是否显示|'none':销毁组件 、 'hidden': 隐藏组件  'visible': 显示组件 |



