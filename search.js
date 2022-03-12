const express = require('express');
const router = express.Router();
const db = require('./dbConnection');
router.get('/', (req, res, next) => {
    let filters = "WHERE 1 ";
    if (typeof req.query.q !== "undefined" && req.query.q !== null) {
        if (req.query.q.length < 2) {
            return res.status(500).send({
                message: "failed",
                success: false
            })
        } else {
            filters += "AND name like `%" + req.query.q + "%` ";
        }
    }
    limit = 5;
    if (typeof req.query.limit !== "undefined" && req.query.limit !== null) {
        if (parseInt(req.query.limit) < 1) {
            return res.status(500).send({
                message: "failed",
                success: false
            })
        } else {
            limit = req.query.limit;

        }
    }
    filters += " LIMIT " + limit + " OFFSET " + skip + "";


    db.query(
        `SELECT * FROM id, name from recipes ` + filters,
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