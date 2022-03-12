const express = require('express');
const router = express.Router();
const db = require('./dbConnection');
const { validationResult } = require('express-validator');

router.post('/', (req, res, next) => {
    db.query(
        `SELECT * FROM categories WHERE name = ${db.escape(req.body.name)};`,
        (err, result) => {
            if (result.length) {
                return res.status(409).send({
                    msg: 'This Categories Is Already In Use'
                });
            } else {
                db.query(
                    `INSERT INTO categories (name, createdAt) VALUES ('${req.body.name}', now())`,
                    (err, result) => {
                        if (err) {
                            return res.status(400).send({
                                msg: err
                            });
                            throw err;
                        }
                        return res.status(201).send({
                            msg: 'Categories Succesfully Saved',
                        });
                    }
                );
            }
        }
    );
});

router.put('/:id', (req, res, next) => {
    db.query(
        `SELECT * FROM categories WHERE id = ${db.escape(req.params.id)};`,
        (err, result) => {
            if (result.length) {
                db.query(
                    `UPDATE categories SET name = '${req.body.name}',updatedAt = now() WHERE ID = '${req.params.id}'`,
                    (err, result) => {
                        if (err) {
                            return res.status(400).send({
                                msg: err
                            });
                            throw err;
                        }
                        return res.status(201).send({
                            msg: 'Categories Succesfully Saved',
                        });
                    }
                );

            } else {
                return res.status(409).send({
                    msg: 'Not Found'
                });
            }
        }
    );
});

router.delete('/:id', (req, res, next) => {
    db.query(
        `SELECT * FROM categories WHERE id = ${db.escape(req.params.id)};`,
        (err, result) => {
            if (result.length) {
                db.query(
                    `DELETE FROM categories WHERE ID = '${req.params.id}'`,
                    (err, result) => {
                        if (err) {
                            return res.status(400).send({
                                msg: err
                            });
                            throw err;
                        }
                        return res.status(201).send({
                            msg: 'Categories Succesfully Deleted',
                        });
                    }
                );

            } else {
                return res.status(409).send({
                    msg: 'Not Found'
                });
            }
        }
    );
});
router.get('/', (req, res, next) => {
    db.query(
        `SELECT * FROM categories`,
        (err, result) => {
            return res.status(200).send({
                "success": true,
                "message": "success",
                "data": result
            });
        }
    );
});
module.exports = router;