const express = require('express');
const app = express();

app.post('/accounts', function (req, res) {
    res.send('Hello World!');
});

app.post('/matches', function (req, res) {
    res.send('Hello World!');
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});