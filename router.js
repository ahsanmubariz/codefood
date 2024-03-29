const express = require('express');
const router = express.Router();
const db = require('./dbConnection');
const { signupValidation, loginValidation } = require('./validation');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
router.post('/register', signupValidation, (req, res, next) => {
    db.query(
        `SELECT * FROM users WHERE LOWER(username) = LOWER(${db.escape(
            req.body.username
        )});`,
        (err, result) => {
            console.log(result);
            if (result.length) {
                return res.status(409).send({
                    msg: 'This user is already in use!'
                });
            } else {
                // username is available
                bcrypt.hash(req.body.password, 10, (err, hash) => {
                    if (err) {
                        return res.status(500).send({
                            msg: err
                        });
                    } else {
                        // has hashed pw => add to database
                        db.query(
                            `INSERT INTO users ( username, password) VALUES ( ${db.escape(
                                req.body.username
                            )}, ${db.escape(hash)})`,
                            (err, result) => {
                                console.log(result);
                                if (err) {
                                    return res.status(400).send({
                                        msg: err
                                    });
                                    throw err;
                                }
                                return res.status(201).send({
                                    success:true,
                                    message: 'success',
                                    id: result.insertedId,
                                    username: req.body.username
                                });
                            }
                        );
                    }
                });
            }
        }
    );
});
router.post('/login', loginValidation, (req, res, next) => {
    db.query(
        `SELECT * FROM users WHERE username = ${db.escape(req.body.username)};`,
        (err, result) => {
            // user does not exists
            if (err) {
                throw err;
                return res.status(400).send({
                    msg: err
                });
            }
            if (!result.length) {
                return res.status(401).send({
                    msg: 'username or password is incorrect!'
                });
            }
            // check password
            bcrypt.compare(
                req.body.password,
                result[0]['password'],
                (bErr, bResult) => {
                    // wrong password
                    if (bErr) {
                        return res.status(401).send({
                            msg: 'username or password is incorrect!'
                        });
                    }
                    if (bResult) {
                        const token = jwt.sign({ id: result[0].id }, req.app.get('secretKey'), { expiresIn: '1h' });
                        db.query(
                            `UPDATE users SET last_login = now() WHERE id = '${result[0].id}'`
                        );
                        return res.status(200).send({
                            success: true,
                            message:"success",
                            data:{
                                token:token
                            }
                        });
                    }
                    return res.status(401).send({
                        msg: 'Username or password is incorrect!'
                    });
                }
            );
        }
    );
});
module.exports = router;