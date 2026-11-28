import test from 'node:test'
import assert from 'node:assert/strict'
import {permissionKey,permissionChanges} from '../src/utils/permissionMatrix.js'
test('matrix saves only changed, enabled, active role cells including explicit revocations',()=>{
 const roles=[{id:'r',active:true},{id:'x',active:false}],mechanics=[{id:'m'},{id:'n'},{id:'disabled'}],enabledIds=['m','n'],permissions=[{role_id:'r',mechanic_id:'m',access_level:3}]
 const draft={[permissionKey('r','m')]:0,[permissionKey('r','n')]:2,[permissionKey('r','disabled')]:3,[permissionKey('x','m')]:3}
 assert.deepEqual(permissionChanges({roles,mechanics,enabledIds,permissions,draft}),[{role_id:'r',mechanic_id:'m',access_level:0},{role_id:'r',mechanic_id:'n',access_level:2}])
 assert.deepEqual(permissionChanges({roles,mechanics,enabledIds,permissions,draft:{[permissionKey('r','m')]:3,[permissionKey('r','n')]:0}}),[])
})
