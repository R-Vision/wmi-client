# wmi-client
Wrapper around the WMI client. Linux and Windows WMI clients are supported.

Wmic binaries for Ubuntu and CentOS are included.

### Install
```bash
npm install wmi-client
```

### Usage
```javascript
var WmiClient = require('wmi-client');
```
Two ways to create a new client instance:

```javascript
// WINDOWS ONLY!
var wmi = new WmiClient();
```

```javascript
var wmi = new WmiClient({
    username: 'LOGIN',
    password: 'PASSWORD',
    host: 'IP-ADDRESS',
    ntlm2: true, // only for linux
    
    // OPTIONAL
    // ---------------------------------------------------------------
    // The client is spawned with this location as cwd.
    // NOTE that csv.xsl (see lib/csv.xsl) has to exist in 
    // lib/csv.xsl relative to that location!
    cwd: 'path to target location',
});
```

Query the client:
```javascript
wmi.query('SELECT Caption,Version FROM Win32_OperatingSystem', function (err, result) {
    console.log(result);
    
    /*
    RESULT:
      [{
        Caption: 'Microsoft Windows Server 2008 R2 Enterprise',
        Version: '6.1.7601'
      }]
    */
});
```
