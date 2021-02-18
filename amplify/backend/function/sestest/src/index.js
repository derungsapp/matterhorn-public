/* Amplify Params - DO NOT EDIT
    ENV
    REGION
Amplify Params - DO NOT EDIT */

var aws = require("aws-sdk");
var ses = new aws.SES({ region: "us-west-2" });
var cognito = new aws.CognitoIdentityServiceProvider({ region: "us-east-2" });
var dynamo = new aws.DynamoDB.DocumentClient();


function getStats(items) {

    var stats = []
    var carStats = { label: "car", correct: 0, incorrect: 0, total: 0 }
    var humanStats = { label: "human", correct: 0, incorrect: 0, total: 0 }
    var animalStats = { label: "animal", correct: 0, incorrect: 0, total: 0 }
    var natureStats = { label: "nature", correct: 0, incorrect: 0, total: 0 }
    var undefinedStats = { label: "undefined", correct: 0, incorrect: 0, total: 0 }


    items.forEach(element => {
        if (element.label == "Car") {
            if (element.correct) {
                carStats.correct = carStats.correct + 1;
            } else {
                carStats.incorrect = carStats.incorrect + 1;
            }
            carStats.total = carStats.total + 1;
        }
    });

    items.forEach(element => {
        if (element.label == "Human") {
            if (element.correct) {
                humanStats.correct = humanStats.correct + 1;
            } else {
                humanStats.incorrect = humanStats.incorrect + 1;
            }
            humanStats.total = humanStats.total + 1;
        }
    });

    items.forEach(element => {
        if (element.label == "Animal") {
            if (element.correct) {
                animalStats.correct = animalStats.correct + 1;
            } else {
                animalStats.incorrect = animalStats.incorrect + 1;
            }
            animalStats.total = animalStats.total + 1;
        }
    });

    items.forEach(element => {
        if (element.label == "Nature") {
            if (element.correct) {
                natureStats.correct = natureStats.correct + 1;
            } else {
                natureStats.incorrect = natureStats.incorrect + 1;
            }
            natureStats.total = natureStats.total + 1;
        }
    });

    items.forEach(element => {
        if (element.label == "Undefined") {
            if (element.correct) {
                undefinedStats.correct = undefinedStats.correct + 1;
            } else {
                undefinedStats.incorrect = undefinedStats.incorrect + 1;
            }
            undefinedStats.total = undefinedStats.total + 1;
        }
    });

    stats.push(carStats)
    stats.push(humanStats)
    stats.push(animalStats)
    stats.push(natureStats)
    stats.push(undefinedStats)


    return stats;
}


async function getUsersAsync() {
    var cognitoParams = {
        "Limit": 60,
        "UserPoolId": "us-east-2_qwimQUH6l",
        "AttributesToGet": ["email"],
    };
    var response = await cognito.listUsers(cognitoParams).promise();
    return response.Users;
}


async function getDynamoDbItems() {
    var payload = {
        TableName: "matterhorn-master"
    };

    var response = await dynamo.scan(payload).promise();
    return response.Items;
}

async function sendEmail(address, globalStats, userStats) {


    var html = `
            <style type="text/css">
            .tg  {border-collapse:collapse;border-spacing:0;}
            .tg td{border-color:black;border-style:solid;border-width:1px;font-family:Arial, sans-serif;font-size:14px;
              overflow:hidden;padding:10px 5px;word-break:normal;}
            .tg th{border-color:black;border-style:solid;border-width:1px;font-family:Arial, sans-serif;font-size:14px;
              font-weight:normal;overflow:hidden;padding:10px 5px;word-break:normal;}
            .tg .tg-abx8{background-color:#c0c0c0;font-weight:bold;text-align:left;vertical-align:top}
            .tg .tg-0lax{text-align:left;vertical-align:top}
            </style>
            <h1>Global Statistics</h1>
            <table class="tg">
            <thead>
              <tr>
                <th class="tg-abx8">Label</th>
                <th class="tg-abx8">Correct</th>
                <th class="tg-abx8">Incorrect</th>
                <th class="tg-abx8">Total</th>
              </tr>
            </thead>
            <tbody>`;

    globalStats.forEach(labelData => {
      html += "<tr>";
      html += '<td class="tg-0lax">' + labelData.label + '</td>';
      html += '<td class="tg-0lax">' + labelData.correct + '</td>';
      html += '<td class="tg-0lax">' + labelData.incorrect + '</td>';
      html += '<td class="tg-0lax">' + labelData.total + '</td>';
      html += "</tr>";
    });  
    
    html += `</tbody>
            </table>
            `;

    html += `<h1>User Statistics</h1>
            <table class="tg">
            <thead>
              <tr>
                <th class="tg-abx8">Label</th>
                <th class="tg-abx8">Correct</th>
                <th class="tg-abx8">Incorrect</th>
                <th class="tg-abx8">Total</th>
              </tr>
            </thead>
            <tbody>`;

    userStats.forEach(labelData => {
      html += "<tr>";
      html += '<td class="tg-0lax">' + labelData.label + '</td>';
      html += '<td class="tg-0lax">' + labelData.correct + '</td>';
      html += '<td class="tg-0lax">' + labelData.incorrect + '</td>';
      html += '<td class="tg-0lax">' + labelData.total + '</td>';
      html += "</tr>";
    });  
    
    html += `</tbody>
        </table>
        `;

    var params = {
        Destination: {
            ToAddresses: [address],
        },
        Message: {
            Body: {
                Html: { Data: html },
            },

            Subject: { Data: "Daily stats" },
        },
        Source: "robin@derungs.app",
    };

    await ses.sendEmail(params).promise();
}

exports.handler = async function (event) {

    var mails = [];
    var users = await getUsersAsync();
    var dynamoDbItems = await getDynamoDbItems();
    var globalStats = getStats(dynamoDbItems);

    users.forEach(user => {
        var userStats = getStats(dynamoDbItems.filter(item => item.user == user.Username));

        mails.push({
            toAddress: user.Attributes[0].Value,
            globalStats: globalStats,
            userStats: userStats
        });
    });

    for (const mail of mails) {
      await sendEmail(mail.toAddress, mail.globalStats, mail.userStats);
      console.log("sent to " + mail.toAddress);
    } 

    return 0;
};