const express = require('express');
const router=express.Router();
const jwt = require("jsonwebtoken");
const dotenv = require('dotenv') 
const bcrypt = require('bcryptjs')
const faker = require('faker');
const multer = require('multer');
const path = require('path');
const paypal = require('@paypal/checkout-server-sdk');

const {saveFilestoBucket, getFilefromBucket, getKeys} = require('../s3.js')

dotenv.config()
const {createOrUpdate, getItemsByParams, generateTimeBasedId, getAllItems,deleteItems} = require('../db.js');
const {sendMail} = require('../oauth.config.js');
const { generateToken, verifyAuth}=require("../auth.js");
const { verify } = require('crypto');
const clientTable = "clients"
const wizardTable = "wizards"
const orderTable = "order"
const bidsTable = "bids"

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now()+path.extname(file.originalname))
  }
});

// Initialize Multer with storage and set maximum files to 10
const upload = multer({ storage: storage }).array('files', 10);

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
          var client = await getItemsByParams("email", decoded.email, clientTable)
          client.data.isVerified = true; 
          const response = await createOrUpdate(client.data, clientTable);
          if(response.success==false) {
            console.log("client updation for email verification failed"); 
            res.send(
              "Email verification failed, please signup again"
            );
          } else {
            res.red
            res.redirect('https://main.d2wogb19inxzl9.amplifyapp.com/auth/client-signin');
          }
        } catch { 
          console.log("get client for email verification failed"); 
          res.send(
            "Email verification failed, please signup again"
          );
        }
      }
    });
});

router.post('/register',async(req,res)=>{ 
    const email = req.body.email; 
    try {
      let client = await getItemsByParams("email", email, clientTable)
      if(client.data != {} && client.data.isVerified == true) {
        console.log("User with the email already exists, please login"); 
        res.send("User with the email already exists, please login, please login");
      } else { 
          let user=req.body;
          let hash= bcrypt.hashSync(user.password,12);
          user.password=hash
          user.username = generateFictionalName(); 
          user.rating = 0
          user.isVerified = false
          user.orders = 0
          user.id = generateTimeBasedId(user.username)
          const response = await createOrUpdate(user, clientTable); 
          if(response.success==false) {
            console.log("client creation failed"); 
            res.send("Client creation failed, please signup again");
          } else {
            // sendEmailVerification(email,"client");
            sendMail(email,"verify","client")
            res.send(200);
          }
      }
    } catch(error) {
      res.send("error occured");
    }
});

router.post('/editprofile',verifyAuth, async(req, res)=> {
  const email = req.user.email; 
  try{
    let client = await getItemsByParams("email", email, clientTable);
    if(client.data != {} && client.data.isVerified == true) {
      let updatedFeilds=req.body;
      if(updatedFeilds.hasOwnProperty('password'))
      {
        let hash= bcrypt.hashSync(updatedFeilds.password,12);
        updatedFeilds.password=hash;
      }
      for(key in updatedFeilds){
        client.data[key]=updatedFeilds[key];
      }
      const response = await createOrUpdate(client.data, clientTable); 
      if(response.success==false) {
        console.log("client profile updation failed"); 
        res.send("Client  profile updation failed, please try again");
      } else {
        res.send(200);
      }
    } else {
        res.send("dberror",client);
    }
  }
  catch(error) {
    res.send("error occured");
  }
});

router.post('/forgetpassword',async(req,res)=>{
  const email = req.body.email;
  try{
    let client = await getItemsByParams("email", email, clientTable)
    if(client.data != {} && client.data.isVerified == true) {
      sendMail(email,"password","client");
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
        var client = await getItemsByParams("email", decoded.email, clientTable)
        let hash= bcrypt.hashSync(req.body.password,12);
        client.data.password=hash;
        const response = await createOrUpdate(client.data, clientTable);
        if(response.success==false) {
          console.log("client updation for password reset failed"); 
          res.send(
            "Password reset failed, please try again"
          );
        } else {
          res.send("Password reset successfully, please go to login page");
        }
      } catch { 
        console.log("post client for password reset failed"); 
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
    let client = await getItemsByParams("email", email, clientTable)
    if(client.data != {} && client.data.isVerified == true) {
      let hash=client.data.password;
      let matchPassword = bcrypt.compareSync(password,hash)
      if(matchPassword){
        let token=generateToken(email,60*60);
        client.data.token = token; 
        client.data.password=null;
        res.send(200, client.data)
      } else {
        res.send("Password doesn't match");
      } 
    } else {
      res.send("User doesn't exist");
    }
  } catch{
      res.send("db error")
  }
});

router.get('/profile',verifyAuth,async(req,res)=>{ 
  const email = req.user.email;  
  try {
    let client = await getItemsByParams("email", email, clientTable)
    if(client.data != {} && client.data.isVerified == true) {
        client.data.password=null;
        res.send(200, client.data)
    } else {
      res.send("dberror");
    }
  } catch {
    res.send("dberror");
  }
});

router.post('/order',verifyAuth,async(req,res)=>{  

  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err)
    } else if (err) {
      return res.status(500).json(err)
    }
    const files = req.files;
    console.log("order creation request : ", req.body)
    const order = req.body; 
    order.clientId = req.user.id
    order.wizardId = "NA"
    order.status = "open"
    order.paymentId = ""
    order.completedMilestones = 0
    order.clientRating = 0 
    order.wizardRating = 0 
    order.creationtimestamp = Date.now()
    order.id = generateTimeBasedId(order.title)
    cnt = 1
    files.forEach(file => {
      saveFilestoBucket('orderattachmentuploads',file, order.id, req.user.id)
      cnt += 1
    })
    order.filesCount =  cnt-1
    const response = await createOrUpdate(order, orderTable); 

    if(response.success == false) {
      res.send("Order creation failed");
    } else {
      res.send(200);
    }
  });
  

}); 

router.get('/bids/:id',verifyAuth,async(req,res)=>{ 
  const { id } = req.params; 
  try {
    const bids = await getAllItems(bidsTable); 
    const wizards = (await getAllItems(wizardTable)).data 

    openbids = [] 
    bids.data.forEach(bid => {
      if (bid.orderId == id) { 
        openbid1 = bid
        wizards.forEach(wizard =>{
          if(bid.wizardId == wizard.id){
            openbid1.wizardRating = wizard.rating;
            openbid1.wizardName = wizard.name;
          }
        })
        openbids.push(openbid1);
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

router.get('/allorders',verifyAuth,async(req,res)=>{ 
  try {
    const orders = await getAllItems(orderTable); 

    // orders = orders.sort((a, b) => a.creationtimestamp<b.creationtimestamp)
    const openOrders = [];
    const activeOrders = [];
    const completedOrders = [];
    
    orders.data.forEach(order => {
      if(order.clientId == req.user.id) {
        if (order.status == "open") {
          openOrders.push(order);
        } else if (order.status === 'active') {
          activeOrders.push(order);
        } else if (order.status === 'completed') {
          completedOrders.push(order);
        }
      }
    }); 
    res.status(200).json({
      "pendingOrders" : openOrders,
      "activeOrders" : activeOrders,
      "completedOrders" : completedOrders
    })
  } catch(error) {
      res.send(error.message)
  }
});

router.get('/order/:id',verifyAuth,async(req,res)=>{ 
  const { id } = req.params; 
  try {
    const order = await getItemsByParams("id", id, orderTable); 
    if(order.data == {}) {
      res.send("no order");
    } else {
      res.status(200).json({
        "order":order.data
      })
    }    
  } catch {
    res.send("db error");
  }
});

router.post('/acceptbid',verifyAuth,async(req,res)=>{ 
  const {wizardId, orderId, finalBudget, paymentId} = req.body;  
  try {
    let order = (await getItemsByParams("id", orderId, orderTable)).data; 
    let bids = await getAllItems(bidsTable); 
    openbids = []  
    let bid1;
    // console.log(bids)
    bids.data.forEach(bid => {
      if (bid.orderId == orderId) {
        openbids.push(bid.id)
      }
    }); 
    order.wizardId = wizardId
    order.finalPrice = finalBudget; 
    order.status = "active"
    order.paymentId = paymentId
    console.log(order)
    const response = await createOrUpdate(order, orderTable); 
    const response2 = await deleteItems(bidsTable, openbids)

    if(response.success == false) {
      res.send("Order updation failed");
    } else {
      res.send(200);
    }
  } catch(error) {
    console.log(error)
    res.send("db error");
  }
}); 

let environment = new paypal.core.SandboxEnvironment('Aa5fzgfZFr4Hcdci_xopFmZ4YFlj9XOfGKlmyJn6_t8k_D-J7QzebFTpnHMaubEeaFDo3Ke-ubTY7NbH', 'EIQkhkRona9zp5JRZe1bVUTC9i0BEzWGfxBtL_U24kfjaPbLpLppOxZWflLcSaS979fyapZ_5pJwB5ZD');
let client = new paypal.core.PayPalHttpClient(environment);

router.post('/pay', verifyAuth,async (req, res) => { 
  console.log("hi from /pay")
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: req.body.amount,
      }
    }]
  });

  try {
    const order = await client.execute(request);
    res.json({ id: order.result.id });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/capture',verifyAuth, async (req, res) => { 
  console.log("in capture =>", req.body)
  const { orderID } = req.body;
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});

  try {
    const capture = await client.execute(request);
    res.json(capture.result);
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/updatemilestone',verifyAuth, async(req, res) => {
  try {
    const {orderId} = req.body
    let order = (await getItemsByParams("id", orderId, orderTable)).data; 
    if (order.completedMilestones == order.milestones) {
      return res.send("cannot increment the milestones") 
    } 
    order.completedMilestones = order.completedMilestones + 1;
    const response = await createOrUpdate(order, orderTable); 
    if(response.success == false) {
      res.send("Order updation failed");
    } else {
      res.send(200);
    }
  } catch(error) {
    console.log(error)
    res.send("db error");
  }
});

router.get('/orderattachments/:id', verifyAuth, async(req, res)=>{
  const orderId = req.params.id; 

  keys = await getKeys(orderId, req.user.id, "")

  urls = []
  for (let i = 0; i < keys.length; i++) {
    url = await getFilefromBucket('orderattachmentuploads', keys[i].Key)
    urls.push(url)
  }
  
  return res.json({"urls": urls})
})

router.post('/closeorder', verifyAuth, async(req, res) => {
  try {
    const {orderId} = req.body
    console.log(orderId)
    let order = (await getItemsByParams("id", orderId, orderTable)).data; 
    order.status = "completed"
    order.completiontimestamp  = Date.now()
    let wizards = (await getAllItems(wizardTable)); 
    let wizard = wizards[0]
    wizards.data.forEach(wizard1 => {
      if(order.wizardId == wizard1.id) {
        wizard = wizard1
      }
    })
    console.log("wizard", wizard)

    let client = (await getItemsByParams("email", req.user.email, clientTable)).data; 
    console.log("client", client)
    wizard.orders = wizard.orders + 1; 
    client.orders = client.orders + 1; 
    await createOrUpdate(wizard, wizardTable);
    await createOrUpdate(client, clientTable);
    const response = await createOrUpdate(order, orderTable); 
  
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

router.post('/rating',verifyAuth, async(req, res) => {
   try {
    const {rating, wizardId} = req.body; 
    let wizards = (await getAllItems(wizardTable)); 
    let wizard = wizards[0]
    wizards.data.forEach(wizard1 => {
      if(wizardId == wizard1.id) {
        wizard = wizard1
      }
    }) 

    wizard.rating = (wizard.rating * (wizard.orders-1) + rating)/(wizard.orders);
    const response = await createOrUpdate(wizard, wizardTable);

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

function generateFictionalName() {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  return `${firstName} ${lastName}`;
}

module.exports=router;