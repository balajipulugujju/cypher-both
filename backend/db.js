const {db} = require('./config.js');
const crypto = require('crypto');  

const createOrUpdate = async (data, table) =>{
    const params = {
        TableName: table,
        Item: data
    }

    try{
        await db.put(params).promise()
        return { success: true }
    } catch(error){
        console.log("dberror  "+ error);
        return { success: false}
    }
} 

const getAllItems = async(table)=>{
    const params = {
        TableName: table
    }

    try{
        const { Items = [] } = await db.scan(params).promise()
        return {data:Items}
    } catch(error){ 
        console.log(error)
        throw error
    }

} 

const deleteItems = async (tableName, keys) => {
    const params = {
      RequestItems: {
        [tableName]: keys.map(key => ({
          DeleteRequest: {
            Key: key
          }
        }))
      }
    };
  
    try {
      const data = await docClient.batchWrite(params).promise();
      console.log('Items deleted successfully:', data);
    } catch (error) {
      console.error('Error deleting items:', error);
    }
  };
  

const getItemsByParams = async (key, value, table) => { 
    var params = {
        TableName: table,
        Key: {
            [key]: value
        }
    }
    try {
        const { Item = {} } =  await db.get(params).promise() 
        return {data:Item}
    } catch(error){ 
        console.log(error)
        throw error
    }
}

function generateTimeBasedId(clientId) {
    const timestamp = Date.now();  // Get the current timestamp in milliseconds
    uniqueId = `${timestamp}_${clientId || generateRandomClientId()}`;  // Combine with client ID 
    uniqueId = uniqueId.replace(' ', '_')
    return uniqueId;
}

function generateRandomClientId() {
    return crypto.randomBytes(16).toString('hex'); 
}
  
module.exports = {
    createOrUpdate,
    getItemsByParams,
    generateTimeBasedId,
    getAllItems,
    deleteItems,
}
