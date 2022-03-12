const express = require('express');
const router = express.Router();
const db = require('./dbConnection');
const { validationResult } = require('express-validator');

router.post('/', (req, res, next) => {
    db.beginTransaction(function (err) {
        if (err) {
            return db.rollback(function () {
                return res.status(500).send({
                    msg: err
                })
            });
        }
        if (req.body.ingredientsPerServing <= 0) return res.status(500).send({
            msg: "fill Ingredients"
        })
        if (req.body.steps <= 0) return res.status(500).send({
            msg: "fill Steps"
        })
        if (!req.body.recipeCategoryId || parseInt(req.body.recipeCategoryId) == 0) return res.status(500).send({
            msg: "Fill Category"
        })
        if (!req.body.nServing) return res.status(500).send({
            msg: "fill nServing"
        })
        if (!req.body.image) return res.status(500).send({
            msg: "fill Image"
        })
        db.query(
            `SELECT * FROM recipes WHERE name = ${db.escape(req.body.name)};`,
            (err, result) => {
                if (err) {
                    return db.rollback(function () {
                        return res.status(500).send({
                            msg: err
                        })
                    });
                }

                if (result.length) {
                    return res.status(500).send({
                        msg: "Name Already Used"
                    })
                }
                db.query(
                    `SELECT * FROM categories WHERE id = ${db.escape(req.body.recipeCategoryId)};`,
                    (err, result) => {
                        if (err) {
                            return db.rollback(function () {
                                return res.status(500).send({
                                    msg: err
                                })
                            });
                        }
                        if (result.length == 0) {
                            return res.status(500).send({
                                msg: "categories not fouond"
                            })
                        }
                        db.query(
                            `INSERT INTO recipes (name, recipeCategoryId,image,nServing,createdAt) VALUES ('${req.body.name}','${req.body.recipeCategoryId}','${req.body.image}','${req.body.nServing}',now());`,
                            (err, result) => {
                                if (err) {
                                    return db.rollback(function () {
                                        return res.status(500).send({
                                            msg: err
                                        })
                                    });

                                }
                                if (result.length == 0) {
                                    return db.rollback(function () {
                                        return res.status(500).send({
                                            msg: err
                                        })
                                    });
                                }
                                let recipeId = result.insertId;
                                let insertedSteps = "";

                                req.body.steps.forEach((step, index) => {
                                    insertedSteps += "(" + recipeId + ",'" + step.stepOrder + "','" + step.description + "')";
                                    if (index + 1 != req.body.steps.length) insertedSteps += ",";
                                })
                                db.query(
                                    `INSERT into recipeSteps (recipesId,stepOrder,description) VALUES ` + insertedSteps + `;`,
                                    (err, result) => {
                                        if (err) {
                                            return db.rollback(function () {
                                                return res.status(500).send({
                                                    msg: err
                                                })
                                            });
                                        }
                                        let ingredients = "";
                                        let allowedUnit = [
                                            "Butir"
                                            , "Buah"
                                            , "Lembar"
                                            , "Kilogram"
                                            , "Gram"
                                            , "Miligram"
                                            , "Liter"
                                            , "Mililiter"
                                            , "Sendok Teh"
                                            , "Sendok Makan"
                                        ];
                                        for (let [index, data] of req.body.ingredientsPerServing.entries()) {
                                            if (!allowedUnit.includes(data.unit)) {
                                                return db.rollback(function () {
                                                    return res.status(500).send({
                                                        msg: data.unit + " is not recognized"
                                                    })
                                                });
                                                break;
                                            }
                                            if (parseInt(data.value) <= 0) {
                                                return db.rollback(function () {
                                                    return res.status(500).send({
                                                        msg: "ingredients cannot be empty"
                                                    })
                                                });
                                            }
                                            ingredients += "(" + recipeId + ",'" + data.item + "','" + data.unit + "','" + data.value + "')";
                                            if (index + 1 != req.body.ingredientsPerServing.length) ingredients += ",";
                                        }
                                        db.query(
                                            `INSERT into ingredientsPerServing (recipesId,item,unit,value) VALUES ` + ingredients + `;`,
                                            (err, result) => {
                                                if (err) {
                                                    return db.rollback(function () {
                                                        return res.status(500).send({
                                                            msg: err
                                                        })
                                                    });
                                                }
                                                db.commit(function (err) {
                                                    if (err) {
                                                        return db.rollback(function () {
                                                            return res.status(500).send({
                                                                msg: err
                                                            })
                                                        });
                                                    }
                                                    res.status(200).send({
                                                        msg: "success"
                                                    })
                                                });
                                            }
                                        )
                                    }
                                )
                            }
                        );
                    }
                );
            }
        );
    });


});
router.get('/', async (req, res, next) => {
    try {
        let filters = " WHERE 1 ";
        if (typeof req.query.q !== "undefined" && req.query.q !== null) filters += "AND name like `%" + req.query.q + "%` ";
        if (typeof req.query.categoryId !== "undefined" && req.query.categoryId !== null) filters += "AND recipeCategoryId = " + req.query.categoryId + " ";
        if (typeof req.query.sort !== "undefined" && req.query.sort !== null) {
            switch (req.query.sort) {
                case "name_asc":
                    filters += " ORDER BY name asc";
                    break;
                case "name_desc":
                    filters += " ORDER BY name desc";
                    break;
                case "like_desc":
                    filters += " ORDER BY nReactionLike desc";
                    break;
                default:
                    break;
            }
        }
        let limit = 10;

        if (typeof req.query.limit !== "undefined" && req.query.limit !== null) {
            limit = req.query.limit;
        }
        let skip = 0;

        if (typeof req.query.skip !== "undefined" && req.query.skip !== null) {
            skip = req.query.skip
        }
        filters += " LIMIT " + limit + " OFFSET " + skip + "";
        let result = await db.query('SELECT * FROM recipes ' + filters);
        result = await JSON.parse(JSON.stringify(result));
        for await (let [index, data] of result.entries()) {
            let res = await db.query('SELECT * FROM categories WHERE ID =' + data.recipeCategoryId + '');
            result[index]["recipeCategory"] = res[0];
        }

        await res.status(200).json({
            success: true,
            message: 'success',
            data: {
                total: result.length,
                recipes: result
            }
        });
    } finally {
        if (db && db.end) db.end()
    }

})
router.get('/:id', async (req, res, next) => {
    let nServing = 1;
    if (typeof req.query.nServing !== "undefined" && req.query.nServing !== null) {
        if (parseInt(req.query.nServing) < 1) {
            return res.status(500).send({
                msg: "minimum nServing is 1"
            })
        } else {
            nServing = parseInt(req.query.nServing);
        }
    }
    let result = await db.query('SELECT * FROM recipes WHERE id= ' + req.params.id + ' AND nServing = ' + nServing + ';');
    result = await JSON.parse(JSON.stringify(result));
    result = result[0];


    let category = await db.query('SELECT * FROM categories WHERE ID =' + result.recipeCategoryId + '');
    result["recipeCategory"] = category[0];

    let ingredients = await db.query('SELECT * FROM ingredientsPerServing WHERE recipesId =' + result.id + '');
    ingredients = await JSON.parse(JSON.stringify(ingredients));
    for await (let [index, data] of ingredients.entries()) {
        delete ingredients[index].recipesId;
    }
    result["ingredientsPerServing"] = ingredients;

    await res.status(200).json({
        success: true,
        message: 'success',
        data: result
    });
})
router.get('/:id/steps', async (req, res, next) => {
    let result = await db.query(`SELECT * FROM recipeSteps WHERE recipesId =${db.escape(req.params.id)}`);
    if (result.length <= 0) return res.status(500).send({
        success: false,
        message: "Not Found"
    });
    result = await JSON.parse(JSON.stringify(result));
    for await (let [index, data] of result.entries()) {
        delete result[index].recipesId;
    }
    await res.status(200).send({
        success: true,
        data: result
    })
});
router.put('/:id', (req, res, next) => {
    db.beginTransaction(function (err) {
        if (err) {
            return db.rollback(function () {
                return res.status(500).send({
                    msg: err
                })
            });
        }
        if (req.body.ingredientsPerServing <= 0) return res.status(500).send({
            msg: "fill Ingredients"
        })
        if (req.body.steps <= 0) return res.status(500).send({
            msg: "fill Steps"
        })
        if (!req.body.recipeCategoryId || parseInt(req.body.recipeCategoryId) == 0) return res.status(500).send({
            msg: "Fill Category"
        })
        if (!req.body.nServing) return res.status(500).send({
            msg: "fill nServing"
        })
        if (!req.body.image) return res.status(500).send({
            msg: "fill Image"
        })
        db.query(
            `SELECT * FROM recipes WHERE id = ${db.escape(req.params.id)};`,
            (err, result) => {
                if (err) {
                    return db.rollback(function () {
                        return res.status(500).send({
                            msg: err
                        })
                    });
                }

                if (result.length == 0) {
                    return res.status(500).send({
                        msg: "Not Found"
                    })
                }
                db.query(
                    `SELECT * FROM categories WHERE id = ${db.escape(req.body.recipeCategoryId)};`,
                    (err, result) => {
                        if (err) {
                            return db.rollback(function () {
                                return res.status(500).send({
                                    msg: err
                                })
                            });
                        }
                        if (result.length == 0) {
                            return res.status(500).send({
                                msg: "categories not fouond"
                            })
                        }
                        db.query(
                            `UPDATE RECIPES SET name ='${req.body.name}', recipeCategoryId = '${req.body.recipeCategoryId}', image = '${req.body.image}',nServing ='${req.body.nServing}' ,updatedAt = now() WHERE ID = ${req.params.id};`,
                            (err, result) => {
                                if (err) {
                                    return db.rollback(function () {
                                        return res.status(500).send({
                                            msg: err
                                        })
                                    });

                                }
                                if (result.length == 0) {
                                    return db.rollback(function () {
                                        return res.status(500).send({
                                            msg: err
                                        })
                                    });
                                }
                                let insertedSteps = "";

                                req.body.steps.forEach((step, index) => {
                                    insertedSteps += "(" + req.params.id + ",'" + step.stepOrder + "','" + step.description + "')";
                                    if (index + 1 != req.body.steps.length) insertedSteps += ",";
                                })
                                db.query(`DELETE FROM recipeSteps WHERE recipesID = ${req.params.id}`);
                                db.query(
                                    `INSERT into recipeSteps (recipesId,stepOrder,description) VALUES ` + insertedSteps + `;`,
                                    (err, result) => {
                                        if (err) {
                                            return db.rollback(function () {
                                                return res.status(500).send({
                                                    msg: err
                                                })
                                            });
                                        }
                                        let ingredients = "";
                                        let allowedUnit = [
                                            "Butir"
                                            , "Buah"
                                            , "Lembar"
                                            , "Kilogram"
                                            , "Gram"
                                            , "Miligram"
                                            , "Liter"
                                            , "Mililiter"
                                            , "Sendok Teh"
                                            , "Sendok Makan"
                                        ];
                                        for (let [index, data] of req.body.ingredientsPerServing.entries()) {
                                            if (!allowedUnit.includes(data.unit)) {
                                                return db.rollback(function () {
                                                    return res.status(500).send({
                                                        msg: data.unit + " is not recognized"
                                                    })
                                                });
                                                break;
                                            }
                                            if (parseInt(data.value) <= 0) {
                                                return db.rollback(function () {
                                                    return res.status(500).send({
                                                        msg: "ingredients cannot be empty"
                                                    })
                                                });
                                            }
                                            ingredients += "(" + req.params.id + ",'" + data.item + "','" + data.unit + "','" + data.value + "')";
                                            if (index + 1 != req.body.ingredientsPerServing.length) ingredients += ",";
                                        }
                                        db.query(`DELETE FROM ingredientsPerServing WHERE recipesID = ${req.params.id}`);
                                        db.query(
                                            `INSERT into ingredientsPerServing (recipesId,item,unit,value) VALUES ` + ingredients + `;`,
                                            (err, result) => {
                                                if (err) {
                                                    return db.rollback(function () {
                                                        return res.status(500).send({
                                                            msg: err
                                                        })
                                                    });
                                                }
                                                db.commit(function (err) {
                                                    if (err) {
                                                        return db.rollback(function () {
                                                            return res.status(500).send({
                                                                msg: err
                                                            })
                                                        });
                                                    }
                                                    res.status(200).send({
                                                        msg: "success"
                                                    })
                                                });
                                            }
                                        )
                                    }
                                )
                            }
                        );
                    }
                );
            }
        );
    });


});
router.delete('/:id', async (req, res, next) => {
    await db.query(`DELETE FROM recipes WHERE id = ${req.params.id}`);
    await db.query(`DELETE FROM ingredientsPerServing WHERE recipesID = ${req.params.id}`);
    await db.query(`DELETE FROM recipeSteps WHERE recipesID = ${req.params.id}`);

    await res.status(200).send({
        msg: "success"
    })

})
module.exports = router;