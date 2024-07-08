const {s3} = require('./config.js');
const fs = require('fs');


function saveFiletoBucket(file, email) {

    fs.readFile(file.path, (err, data) => {
      if (err) {
        console.log(err)
      }
  
      // Set up S3 upload parameters
      const params = {
        Bucket: 'panuploads',
        Key: "pan_"+email.replace('@','').replace('.','')+".pdf",
        Body: data
      };

  
      // Upload the file to S3
      s3.upload(params, (err, data) => {
        if (err) {
          console.log(err)
        }
        console.log("file path = ", file.path)
        // Delete the file from the local filesystem after upload
        fs.unlink(file.path, (err) => {
          if (err) {
            console.log(err)
          }
        });
          console.log("successfully saved to s3")
          // res.status(200).send(`File uploaded successfully. ${data.Location}`);
      });
    });
}

function saveFilestoBucket(bucket, file, id, user_id) {

  fs.readFile(file.path, (err, data) => {
    if (err) {
      console.log(err)
    }

    // Set up S3 upload parameters
    const params = {
      Bucket: bucket,
      Key: "order_"+id+"_"+user_id+"_"+String(Date.now()),
      Body: data,
      // ContentType: mime.lookup(file.originalname) || 'application/octet-stream'
    };


    // Upload the file to S3
    s3.upload(params, (err, data) => {
      if (err) {
        console.log(err)
      }
      console.log("file path = ", file.path)
      // Delete the file from the local filesystem after upload
      fs.unlink(file.path, (err) => {
        if (err) {
          console.log(err)
        }
      });
        console.log("successfully saved to s3")
        // res.status(200).send(`File uploaded successfully. ${data.Location}`);
    });
  });
}

async function getFilefromBucket(bucket, key) {
  // const params = {
  //   Bucket: 'orderattachmentuploads',
  //   Key: "order_"+key,
  // };
  // data = await s3.getObject(params).promise()
  // console.log(data)

  const params2 = {
    Bucket: bucket,
    Key: key,
    Expires: 60 * 60 * 12// URL expires in 5 minutes
  };  


  data2 = await s3.getSignedUrlPromise('getObject', params2);
  console.log(data2)
  return data2
  // return data
}

async function getKeys(orderId, client_id, wizard_id) {
  const params = {
    Bucket: 'orderattachmentuploads'
  };

  const data = await s3.listObjectsV2(params).promise();
  let filteredObjects = data.Contents.filter(obj =>obj.Key.includes(orderId));
  if(wizard_id != "") {
  return filteredObjects.filter(obj => (obj.Key.includes(client_id) || obj.Key.includes(wizard_id)));   
  }
  return filteredObjects
}

module.exports = {
  saveFiletoBucket,
  saveFilestoBucket,
  getFilefromBucket,
  getKeys,
}

