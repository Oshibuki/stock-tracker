/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
const Joi = require('@hapi/joi');
const fetch = require('node-fetch')

const mongoose = require("mongoose")
mongoose.connect(process.env.DB,{ useNewUrlParser: true })

const StockRecord = require("../models/stockRecord")


//获取客户端真实ip;
function getClientIp(req) {
    var ipAddress;
  //   let ips = req.headers["x-forwarded-for"].split(",");
  // let ip;
  // if(ips[0].match(/^((2[0-4]\d|25[0-5]|[01]?\d\d?)\.){3}(2[0-4]\d|25[0-5]|[01]?\d\d?)$/g)){
  //    ip = ips[0]
  // }
    var forwardedIpsStr = req.headers['x-forwarded-for'];//判断是否有反向代理头信息
    if (forwardedIpsStr) {//如果有，则将头信息中第一个地址拿出，该地址就是真实的客户端IP；
        var forwardedIps = forwardedIpsStr.split(',');
        ipAddress = forwardedIps[0];
    }
    if (!ipAddress) {//如果没有直接获取IP；
        ipAddress = req.connection.remoteAddress;
    }
    return ipAddress;
};

//get data from api
async function getData(url){
    let response = await fetch(url);
    return response.text();
}

async function getDataFromAPI(url) {
    let response = await fetch(url);
    return response.json();
}

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(async function (req, res){
        try {
            let ip = getClientIp(req)
            var url = `http://web.juhe.cn:8080/finance/stock/usa?key=${process.env.API_KEY}`
            var schema = {
                like:Joi.boolean(),
                stock: [Joi.string().min(1).max(8),Joi.array().max(2).min(1)]
            }
            var result = Joi.validate(req.query,schema);
            if(result.error){
                return res.send("params error")
            }

            const {like,stock} = req.query

            //one stock
            if(typeof stock ==="string"){
                url += `&gid=${stock}`;
                let stockRecord={
                    ipAddress:ip,
                    stock:stock.toLowerCase()
                };
                if(typeof like !=="undefined"){
                    stockRecord.like = JSON.parse(like)
                }
                await StockRecord.updateOne({ipAddress:ip},stockRecord,{upsert:true})
                let data = await getDataFromAPI(url);
                if(data["resultcode"]==="200"){
                    let lastestpri = data.result[0].data.lastestpri;
                    let  records=await StockRecord.find({stock:stock.toLowerCase(),like:true})
                    let result ={
                        stock:stock,
                        price:lastestpri,
                        likes:records.length
                    }
                    res.json({
                        stockData:result
                    })
                }else{
                    return res.send("server error for api")
                }
            }else{
                //two stock
                let [stock1,stock2] = [...stock];
                let url1 = url+ `&gid=${stock1.toLowerCase()}`,url2=url+`&gid=${stock2.toLowerCase()}`;
                let stock1Records = await  StockRecord.find({stock:stock1.toLowerCase(),like:true})
                let stock2Records = await  StockRecord.find({stock:stock2.toLowerCase(),like:true})
                let rel_like1 = stock1Records.length>stock2Records.length?1:stock1Records.length===stock2Records?0:-1;
                let rel_like2 = stock1Records.length>stock2Records.length?-1:stock1Records.length===stock2Records?0:1;
                let data1 =await getDataFromAPI(url1),data2 =await getDataFromAPI(url2);

                let lastestpri1 = data1.result[0].data.lastestpri;
                let lastestpri2 = data2.result[0].data.lastestpri;

                let stockData1 =  {
                    stock:stock1.toLowerCase(),
                    price:lastestpri1
                }
                let stockData2 = {
                    stock:stock2.toLowerCase(),
                    price:lastestpri2
                }

                if(typeof like !=="undefined"){
                    stockData1.rel_likes = rel_like1
                    stockData2.rel_likes = rel_like2
                }

                res.json({
                    stockData:[stockData1,stockData2]
                })
            }
        }catch (e) {
            return res.send(e.message)
        }
    });
};
