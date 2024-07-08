const express = require('express');
const router=express.Router();
const jwt = require("jsonwebtoken");
const dotenv = require('dotenv') 
const bcrypt = require('bcryptjs')
const faker = require('faker');
const multer = require('multer');
const {saveFilestoBucket, getKeys, saveFiletoBucket, getFilefromBucket} = require('../s3.js')
const path = require('path');
dotenv.config()
const {createOrUpdate, getItemsByParams, generateTimeBasedId, getAllItems} = require('../db.js');
const {sendMail} = require('../oauth.config.js');
const { generateToken, verifyAuth}=require("../auth.js")
const wizardTable = "wizards"
const orderTable = "order"
const bidsTable = "bids"  
const clientTable = "clients"


answersList = ["47,24,76,29,5,6,73,98,1","Round Robin","Customer_ID, First_name, Last_name, phone_number","-129","8 sin x cos x","6 4 2 2 4 6", "1","Consistency","3840", "1 9 8"]

function checkAnswers(ans) {
  result = 0
  for (i =1 ; i<=10; i++) {
    if(answersList[i-1]==ans[i]) result += 1
  }
  console.log(result)
  return result
   
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
    // console.log(req)
  },
  
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now()+path.extname(file.originalname))  }
});

const upload = multer({ storage: storage });

const uploads = multer({ storage: storage }).array('files', 10);


router.get('/',(req,res)=>{
    res.send('hi');
})

router.get("/verify/:token", (req, res) => {
  const { token } = req.params;
  jwt.verify(token, process.env.JWT_SECRET, async(err, decoded) =>{
    if (err) {
      console.log(err);
      res.send(
        "Email verification failed,possibly the link is invalid or expired"
      );
    } else { 
      try {
        var wizard = await getItemsByParams("email", decoded.email, wizardTable)
        wizard.data.isVerified = true; 
        const response = await createOrUpdate(wizard.data, wizardTable);
        if(response.success==false) {
          console.log("wizard updation for email verification failed"); 
          res.send(
            "Email verification failed, please signup again"
          );
        } else {
          res.send("Email verifified successfully, please go to login page");
        }
      } catch { 
        console.log("get wizard for email verification failed"); 
        res.send(
          "Email verification failed, please signup again"
        );
      }
    }
  });
});

router.post('/register',upload.single('pan'),async(req,res)=>{ 
    const email = req.body.email; 
    try {
      let wizard = await getItemsByParams("email", email, wizardTable)
      if(wizard.data.id) {
        console.log(wizard)

        if(wizard.data.isVerified != true){
          sendMail(email,"verify","wizard")
        }
        console.log("User with the email already exists, please login"); 
        res.send("User with the email already exists, please login, please login");
      } else {  
        console.log("hi")
          if(checkAnswers(req.body)<7) {
            res.status(400).json({ error: 'Got less marks' })
          } else if(!req.file) {
              return res.status(400).send('No file uploaded.');
          } else {
            const file = req.file;
            saveFiletoBucket(file, email)
            let user = {};
            let hash= bcrypt.hashSync(req.body.password,12);
            user.email = email
            user.first_name = req.body.first_name
            user.last_name = req.body.last_name
            user.password=hash
            user.username = generateFictionalName();
            user.panVerified = false
            user.isVerified = false
            user.testPassed = true
            user.rating = 0
            user.orders = 0
            user.id = generateTimeBasedId(user.username)
            const response = await createOrUpdate(user, wizardTable); 
            if(response.success==false) {
              console.log("wizard creation failed"); 
              res.status(500).json({error : "wizard creation failed, please signup again"});
            } else {
              sendMail(email,"verify","wizard")
              res.send(200);
            }
          }
          
      }
    } catch(error) { 
      console.log(error)
      res.send("error")
    }
    
});

router.post('/sendmail',async(req,res)=>{ 
  const email = req.body.email; 
  try {
        sendMail(email,"verify","wizard");
        res.send(200);
  } catch(error) { 
    console.log(error)
    res.send("error")
  }
  
});

router.post('/forgetpassword',async(req,res)=>{
  const email = req.body.email;
  try{
    let wizard = await getItemsByParams("email", email, wizardTable)
    if(wizard.data != {} && wizard.data.isVerified == true) {
      sendMail(email,"password","wizard");
      res.send(200);
    }
    else{
      console.log("User with the email doesn't exists, please register");
      res.send("User with the email doesn't exists, please register");
    }
  }catch(error){
    res.send("error occured");
  }

});

router.post('/resetpassword/:token',async(req,res)=>{
  const { token } = req.params;
  jwt.verify(token, process.env.JWT_SECRET, async(err, decoded) =>{
    if (err) {
      console.log(err);
      res.send(
        "Password Reset failed,possibly the link is invalid or expired"
      );
    } else { 
      try {
        var wizard = await getItemsByParams("email", decoded.email, wizardTable)
        let hash= bcrypt.hashSync(req.body.password,12);
        wizard.data.password=hash;
        const response = await createOrUpdate(wizard.data, wizardTable);
        if(response.success==false) {
          console.log("wizard updation for password reset failed"); 
          res.send(
            "Password reset failed, please try again"
          );
        } else {
          res.send("Password reset successfully, please go to login page");
        }
      } catch { 
        console.log("post wizard for password reset failed"); 
        res.send(
          "Password reset failed, please try again"
        );
      }
    }
  });
});

router.post('/login',async(req,res)=>{ 
  const email = req.body.email; 
  const password = req.body.password
  try {
    let wizard = await getItemsByParams("email", email, wizardTable)
    if(wizard.data != {} && wizard.data.isVerified == true) {
      let hash=wizard.data.password;
      let matchPassword = bcrypt.compareSync(password,hash)
      if(matchPassword){
        let token=generateToken(email,60*60);
        wizard.data.token = token; 
        wizard.data.password=null;
        res.send(200, wizard.data)
      } else {
        res.send("Password doesn't match");
      } 
    } else {
      res.send("User doesn't exist");
    }
  } catch {
    res.send("db error");
  }
});

router.get('/profile',verifyAuth,async(req,res)=>{ 
  const email = req.user.email;  
  try {
    let wizard = await getItemsByParams("email", email, wizardTable)
    if(wizard.data != {} && wizard.data.isVerified == true) {
        wizard.data.password=null;
        res.send(200, wizard.data)
    } else {
      res.send("dberror");
    }
  } catch {
    res.send("dberror");
  }
});

router.post('/editprofile',verifyAuth, async(req, res)=> {
  const email = req.user.email; 
  try{
    let wizard= await getItemsByParams("email", email, wizardTable);

    if(wizard.data != {} && wizard.data.isVerified == true) {
      let updatedFeilds=req.body;
      if(updatedFeilds.hasOwnProperty('password'))
      {
        let hash= bcrypt.hashSync(updatedFeilds.password,12);
        updatedFeilds.password=hash;
      }
      for(key in updatedFeilds){
        wizard.data[key]=updatedFeilds[key];
      }
      const response = await createOrUpdate(wizard.data, wizardTable); 
      if(response.success==false) {
        console.log("wizard profile updation failed"); 
        res.send("wizard  profile updation failed, please try again");
      } else {
        res.send(200);
      }
    } else {
        res.send("dberror");
    }
  }
  catch(error) {
    res.send("error occured");
  }
});

router.get('/market',verifyAuth,async(req,res)=>{ 
  try {
    const orders = await getAllItems(orderTable); 
    const openOrders = [];
    orders.data.forEach(order => {
      if (order.status == "open") {
        openOrders.push(order);
      }
    }); 
    res.status(200).json({
      "openOrders" : openOrders
    })
  } catch(error) {
    console.log(error)
      res.send("db error")
  }
});

router.post('/bid',verifyAuth,async(req,res)=>{ 
  const bid = req.body; 
  bid.wizardId = req.user.id
  bid.status = "pending"
  bid.id = generateTimeBasedId(bid.title)
  const response = await createOrUpdate(bid, bidsTable); 
  if(response.success == false) {
    res.send("bid creation failed");
  } else {
    res.send(200);
  }
}); 

router.get('/allorders',verifyAuth,async(req,res)=>{ 
  try {
    const orders = await getAllItems(orderTable); 
    const bids = await getAllItems(bidsTable)
    const activeOrders = [];
    const completedOrders = [];
    const pendingOrders = []
    
    orders.data.forEach(order => {
      if(order.wizardId == req.user.id) {
        if (order.status === 'active') {
          activeOrders.push(order);
        } else if (order.status === 'completed') {
          completedOrders.push(order);
        } 
      } else if (order.wizardId == "NA") {
        bids.data.forEach(bid => {
          if(bid.orderId == order.id && bid.wizardId === req.user.id) {
            pendingOrders.push(order)
          }
        })
      } 
    }); 
    res.status(200).json({
      "pendingOrders" : pendingOrders,
      "activeOrders" : activeOrders,
      "completedOrders" : completedOrders
    })
  } catch {
      res.send("db error")
  }
});

router.get('/bids/:id',verifyAuth,async(req,res)=>{ 
  const { id } = req.params; 
  try {
    const bids = await getAllItems(bidsTable); 
    openbids = [] 
    bids.data.forEach(bid => {
      if (bid.wizardId == id) {
        openbids.push(bid);
      }
    }); 
    res.status(200).json({
      "bids":openbids
    })
  } catch (error){
    console.log(error)
    res.send("db error");
  }
});

router.get('/orderattachments/:id', verifyAuth, async(req, res)=>{
  const orderId = req.params.id; 

  const order = await getItemsByParams("id", orderId, orderTable); 
  keys = await getKeys(orderId, order.data.clientId, req.user.id)

  urls = []
  for (let i = 0; i < keys.length; i++) {
    url = await getFilefromBucket('orderattachmentuploads', keys[i].Key)
    urls.push(url)
  }
  
  return res.json({"urls": urls})
})

router.post('/orderattachments',verifyAuth,async(req,res)=>{  

  uploads(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err)
    } else if (err) {
      return res.status(500).json(err)
    }
    const files = req.files;
    const {orderId} = req.body
    cnt = 1
    files.forEach(file => {
      saveFilestoBucket('orderattachmentuploads',file, orderId, req.user.id)
      cnt += 1
    }) 

    res.send(200);

  });
  

});

router.post('/rating',verifyAuth, async(req, res) => {
  try {
   const {rating, clientId} = req.body; 
   let clients = (await getAllItems(clientTable)); 
    let client = clients[0]
    clients.data.forEach(client1 => {
      if(clientId == client1.id) {
        client = client1
      }
    }) 

   client.rating = (client.rating * (client.orders-1) + rating)/(client.orders);
   const response = await createOrUpdate(client, clientTable);

   if(response.success == false) {
     res.send("Order updation failed");
   } else {
     res.send(200);
   }
  }catch(error) {
   console.log(error)
   res.send("db error");
 }
});

//payments
function generateFictionalName() {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  return `${firstName} ${lastName}`;
}

module.exports=router;