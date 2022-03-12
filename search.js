const express = require('express');
const router = express.Router();
const db = require('./dbConnection');
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