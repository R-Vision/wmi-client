# wmi-client
Wrapper around the WMIC. Only for Linux.

### Install
```bash
npm install wmi-client
```

### Usage
```javascript
var WmiClient = require('wmi-client');

var wmi = new WmiClient({
    username: 'LOGIN',
    password: 'PASSWORD',
    host: 'IP-ADDRESS'
});

wmi.query('SELECT Caption,Version FROM Win32_OperatingSystem', function (err, result) {
    console.log(err || result);
    
    /*
    RESULT:
      [{
        Caption: 'Microsoft Windows Server 2008 R2 Enterprise',
        Version: '6.1.7601'
      }]
    */
});
```

### TODO
* Support Windows
* Simple mode (like WMIC on Windows)
