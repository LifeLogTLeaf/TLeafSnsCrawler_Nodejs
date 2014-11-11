/**
 * 예외사항
 * 1. 티리프 엑세스키가 유요하지 않을경우
 * 2. 페이스북 엑세스키가 유요하지 않을경우
 * 3. 모방일에서 네트워크가 끊겨서 데이터를 받지 못할경우.
 *
 */
var cron = require('cron').CronJob;
var graph = require('fbgraph');
var request = require('request');
var mqtt = require('mqtt');
var moment = require('moment');
var config = require('./config');

moment().format();
graph.setAppSecret(config.appSeacret);
var client = mqtt.createClient(1883, config.brokerUrl);
client.subscribe('1');


var job = new cron({
    cronTime: '*/5 * * * * *',
    onTick: function () {
        console.log("Running");
        client.publish('1', 'hello');
    },
    start: false,
    timeZone: null
});
job.start();

// TLeaf server url
var TLEAF_API_URL = 'http://localhost:8080/tleaf'

// Post Data to TLeaf
function postData(url, data, appId, userId, accessKey) {
    request.post({
            uri: TLEAF_API_URL + url,
            headers: {
                'Content-Type': 'application/json',
                'X-Tleaf-User-Id': userId,
                'X-Tleaf-Application-Id': appId,
                'X-Tleaf-Access-Token': accessKey
            },
            body: data},
        function (err, res, body) {
            console.log("TLeaf API 서버로부터 데이터저장후 상태를 받았습니다.")
            console.log(body);
            console.log(res.statusCode + "\n");
        }
    );
}

// GET User Information form TLeaf
function getUserInfo(appId, userId, accessKey) {
    request.get({
            uri: TLEAF_API_URL + "/api/user",
            headers: {
                'Content-Type': 'application/json',
                'X-Tleaf-User-Id': userId,
                'X-Tleaf-Application-Id': appId,
                'X-Tleaf-Access-Token': accessKey
            }
        },
        function (err, res, body) {
            console.log("TLeaf API 서버로부터 데이터를 받았습니다.")
            console.log(body);
            console.log(res.statusCode + "\n");
            // call getUserFedd with AceessKey information and User information
            getUserFeed(body, appId, userId, accessKey);
        }
    );
}


// Get User Feed from Facebook
function getUserFeed(body, appId, userId, accessKey) {
    var jsonObject = JSON.parse(body);
    var index;
    var accessToken;
    var lastCreatedTime;

    for (var i = 0; i < jsonObject.services.length; i++) {
        if (jsonObject.services[i].appId === 'shack') {
            index = i;
            accessToken = jsonObject.services[i].accessToken;
            if (jsonObject.services[i].lastCreatedTime !== undefined) {
                lastCreatedTime = moment(jsonObject.services[i].lastCreatedTime) / 1000;
            }
        }
    }
    graph.setOptions()
        .get(
        "me/feed",
        {
            since: lastCreatedTime,
            access_token: accessToken
        },
        function (err, res) {
            if (err === null) {
                console.log("페이스북으로부터 데이터를 받았습니다.")
                console.log(res.data.length);
                console.log("\n");
                for (var i = 0; i < res.data.length; i++) {
                    var data = JSON.stringify({ "data": res.data[i]});
                    // Call postData with Data and AccessKey information
                    postData("/api/user/app/log",data, appId, userId, accessKey);
                }

                if (res.data.length > 0) {
                    jsonObject.services[index].lastCreatedTime = res.data[0].created_time;
                    var data2 = JSON.stringify({ "data": jsonObject.services[index]});
                    postData("/api/user", data2, appId, userId, accessKey);
                }
            }
        }
    );
}


client.on('message', function (topic, message) {
    console.log("Broker 서버로부터 데이터를 받았습니다.");
    console.log("topic : " + topic);
    console.log("message : " + message + "\n");
    //var jsonObject = JSON.parse(message);
    var tleafUserId = "e756171d1eb520baecff8c1d1b01ed01";
    var tleafAppId = "shack";
    var tleafAccessKey = "e756171d1eb520baecff8c1d1b0227ef";
    getUserInfo(tleafAppId, tleafUserId, tleafAccessKey)

});


fetch_unix_timestamp = function () {
    return Math.floor(new Date().getTime() / 1000);
}