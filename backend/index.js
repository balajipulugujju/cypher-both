const express = require("express");
const cors = require('cors');
const bodyParser = require('body-parser')

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({extended:false}))
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin:'*'
}));

app.use('/api/client', require('./routes/client'));
app.use('/api/wizard',require('./routes/wizard'));

app.get('/',(req,res)=>{
    res.send(200,'Hello from Genie backend');
});

app.post('/googleform', (req, res) => {
  console.log(req);
})

app.listen(PORT, async () => {
  console.log("Server listening on port "+ PORT);
});

