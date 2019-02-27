const router = require('koa-router')();
//const multiparty = require('koa2-multiparty')
const fs = require('fs');
const path = require('path');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
var Multiparty = require('multiparty');
const AipSpeechClient = require('baidu-aip-sdk').speech;
const mysql = require('../config.js');
// 设置APPID/AK/SK
var APP_ID = "14950461";
var API_KEY = "2roMufS8nRcKMLTPjDEnMVU4";
var SECRET_KEY = "NWfuDj4THCKOz40nxIKEGR0au0Zxupac";
var client = new AipSpeechClient(APP_ID, API_KEY, SECRET_KEY);
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
var n;
router.get('/', async (ctx, next) => {
  await ctx.render('index', {
    title: 'Hello Koa 2!'
  })
})
router.post('/file', async (ctx) => {
	let p = new Promise((resolve,reject) => {
		// 上传单个文件 
	 const file = ctx.request.files.file; 
	 // 获取上传文件 
	 // 创建可读流 
	 const reader = fs.createReadStream(file.path); 
	 const filePath = path.join(__dirname, '../upload') + `/${file.name}`; 
	 // 创建可写流 
	 const upStream = fs.createWriteStream(filePath); 
	 // 可读流通过管道写入可写流 
	 reader.pipe(upStream); 
	 var voicePath = 'upload/' + file.name;
		 const command = ffmpeg();
		 command.addInput(voicePath)
		.audioChannels(1)
		.format('wav')
		.save(voicePath.slice(0,-3) + "wav")
		.on('error',(err) => {
			console.log(err);
		})
		.on('end',() => {
			var voices = fs.readFileSync(voicePath.slice(0,-3) + "wav");
			var voicesBuffer =  Buffer.from(voices);
				client.recognize(voicesBuffer,'wav',16000,{dev_pid: 1536}).then((result) => {
				console.log('<recognize>:' + JSON.stringify(result));
				var str = result.result;
								console.log(str);
				mysql.query("select * from tiku where question like ?;", '%'+str+'%').then(function(result2) {
								result2[0]['oldresult'] = str;
								console.log(result2[0].oldresult);
								resolve(JSON.stringify(result2));
								}, function(error){
												return -1;
												  });
				
				fs.unlink(file.path,(err) => {
					if(err)
					{
						console.error(err);
					}
					console.log("临时路径的文件删除成功")
				});
				fs.unlink(filePath,(err) => {
					if(err)
					{
						console.error(err);
					}
					console.log("upload目录下文件删除成功")
				});
				
			},(err) => {
				console.log(err);
		});
		}); 
	});
	ctx.body = await p.then(result => {
		
		return result;
	});
	
				
})
module.exports = router
