const mongoose = require("mongoose")

var stockRecordSchema = new mongoose.Schema({
    ipAddress: {
        type:String,
        required:true,
        minlength:1,
        maxlength:255
    },
    stock:{
        type:String,
        required:true,
        minlength:1,
        maxlength:20,
        lowercase:true
    },
    like:{
        type:Boolean
    }
})

var StockRecord = new mongoose.model("stockRecord",stockRecordSchema)
module.exports = StockRecord;