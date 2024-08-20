const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

// Mongoose Setup
mongoose.connect(process.env.DB_URI);

const userSchema = new mongoose.Schema({
    username: { type: String, required: true }
});

const logSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: { type: String },
    duration: { type: Number },
    date: { type: Date }
});

const User = mongoose.model('User', userSchema);
const Log = mongoose.model('Log', logSchema);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Something that I don't understand but it's here
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// FUN
// Store user
app.post('/api/users', async (req, res) => {
    try {
        
        const usernameInput = req.body.username;

        const user = new User({ username: usernameInput });
        const userResult = await user.save();

        res.json({ username: usernameInput, _id: userResult._id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Username not stores" });
    }
});

// Show users with IDs
app.get('/api/users', async (req, res) => {
    try {
        const userList = await User.find({}, { username: 1, _id: 1 });
        res.json(userList);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "User list not found" });
    }
});

// Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
    const userId = req.params._id;
    const description = req.body.description;
    const duration = parseInt(req.body.duration);
    let date = req.body.date;

    if (!date) {
        date = new Date();
    } else {
        date = new Date(date);
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ error: "User not found" });
        }

        const exerciseLog = new Log({
            userId: user._id,
            description: description,
            duration: duration,
            date: date
        });

        await exerciseLog.save();

        const responseObj = {
            _id: user._id,
            username: user.username,
            description: description,
            duration: duration,
            date: date.toDateString()
        };
        res.json(responseObj);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Unable to add exercise to user" });
    }
});

// Exercise Logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  //query variables
  const fromDate = req.query.from;
  const toDate = req.query.to;
  const limitLogs = req.query.limit ? parseInt(req.query.limit) : null;

  try {
      const user = await User.findById(userId);

      let query = { userId: user._id };
      let dateRangeQuery = {};
      // date range
      if (fromDate) {
        dateRangeQuery.$gte = new Date(fromDate);
      }
      if (toDate) {
        dateRangeQuery.$lte = new Date(toDate);
      }
      if (fromDate || toDate) {
        query.date = dateRangeQuery;
      }

      let limitQuery = Log.find(query);

      if (limitLogs) {
        limitQuery = limitQuery.limit(limitLogs);
      }

      const getLogs = await limitQuery.exec();

      const userLogsCount = getLogs.length;

      const logMap = getLogs.map(log => ({
        description: log.description,
        duration: log.duration,
        date: log.date.toDateString()
      }));

      const responseObj = {
          _id: user._id,
          username: user.username,
          count: userLogsCount,
          log: logMap
      }
      if (fromDate) responseObj.from = new Date (fromDate).toDateString();
      if (toDate) responseObj.to = new Date (toDate).toDateString();

      res.json(responseObj);

  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Can't show logs of users" });
  }
});

// Port/Server Stuff??
const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
  });
