const mongoose=require('mongoose')
const adminstschema=new mongoose.Schema({
    name:String,
    rollnofrom:String,
    rollnoto:String,

})
module.exports=mongoose.model('adminstudent',adminstschema)