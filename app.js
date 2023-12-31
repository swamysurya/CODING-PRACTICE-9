const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const bcrypt = require('bcrypt')

const app = express()
app.use(express.json())
const DBpath = path.join(__dirname, 'userData.db')
let DB = null
const initializeDbAndServer = async () => {
  try {
    DB = await open({
      filename: DBpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
}

initializeDbAndServer()

app.post('/register', async (request, response) => {
  const {username, name, gender, password, location} = request.body
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  const DBres = await DB.get(getUserQuery)
  if (DBres != undefined) {
    response.status = 400
    response.send('User already exists')
  } else {
    console.log(password.length <= 5)
    if (password.length <= 5) {
      response.status = 400
      response.send('Password is too short')
    } else {
      const hasedPassword = await bcrypt.hash(password, 10)
      const addUserQuery = `
      INSERT INTO user (username,name,password,gender,location)
      VALUES ('${username}','${name}','${hasedPassword}','${gender}','${location}');`
      try {
        await DB.run(addUserQuery)
        response.send('User created successfully')
      } catch (e) {
        console.log(e.message)
      }
    }
  }
})

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  try {
    const DBres = await DB.get(getUserQuery)
    console.log(DBres)
    if (DBres != undefined) {
      //validate passoword
      const res = await bcrypt.compare(password, DBres.password)
      if (res) {
        response.send('Login success!')
      } else {
        response.status = 400
        response.send('Invalid password')
      }
    } else {
      response.status = 400
      response.send('Invalid user')
    }
  } catch (e) {
    console.log(e.message)
  }
})

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  const DBres = await DB.get(getUserQuery)
  console.log(DBres)
  const passwordVerify = await bcrypt.compare(oldPassword, DBres.password)
  if (passwordVerify) {
    if (newPassword.length >= 5) {
      const hasedPassword = await bcrypt.hash(newPassword, 10)
      const insertNewPassQuery = `UPDATE user SET password = '${hasedPassword}' WHERE username = '${username}';`
      try {
        await DB.run(insertNewPassQuery)
        response.send('Password updated')
      } catch (e) {
        console.log(e.message)
      }
    } else {
      response.status = 400
      response.send('Password is too short')
    }
  } else {
    response.status = 400
    response.send('Invalid current password')
  }
})

module.exports = app
