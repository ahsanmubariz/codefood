const express = require('express');
const router = express.Router();
const db = require('./dbConnection');
const { validationResult } = require('express-validator');

router.post('/', async (req, res, next) => {
    if (!req.body.recipeId || parseInt(req.body.recipeId) == 0) return res.status(500).send({
        msg: "Fill Recipe Id"
    })
    if (!req.body.nServing || parseInt(req.body.nServing) < 0) return res.status(500).send({
        msg: "Fill nServing"
    })

    let recipe = await db.query(`SELECT recipes.name as recipeName, recipes.image as image,recipes.nServing as nServing, recipes.image as image, recipes.createdAt as createdAt, categories.name as name FROM recipes INNER JOIN categories ON recipes.recipeCategoryId = categories.id AND recipes.id = ${req.body.recipeId} `);
    if (recipe.length == 0) return res.status(500).send({
        message: "recipe not found"
    });
    recipe = JSON.parse(JSON.stringify(recipe));
    recipe = recipe[0];

    let existing_id = await db.query('SELECT id FROM users');
    existing_id = JSON.parse(JSON.stringify(existing_id));
    let existing_id_array = [];
    for await (let data of existing_id.entries()) {
        existing_id_array.push(data[1]["id"])
    }

    let random_id = "";

    async function generatestring() {
        let length = 2;
        let chars = "QWERTYUIOPASDFGHJKLZXCVBNM";
        let numbers = "1234567890";
        let result = '';
        for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
        for (let i = length; i > 0; --i) result += numbers[Math.floor(Math.random() * numbers.length)];
        return result;
    }

    async function check_generated_string() {
        let generatedString = await generatestring();
        if (!existing_id_array.includes(generatedString)) {
            random_id = generatedString;
        }
    }
    while (random_id == "") {
        await check_generated_string();
    }

    try {
        await db.query(`INSERT INTO cookingHistory (id,recipesId,stepDone,status,reaction,userId) VALUES ('${random_id}',${req.body.recipeId},1,'progress',NULL,${req.body.userid})`);
    } catch (err) {
        console.log(err)
        await res.status(500).send({
            msg: "error insert"
        })
    }

    let history = await db.query(`SELECT * FROM cookingHistory WHERE id = '${random_id}'`);

    history = JSON.parse(JSON.stringify(history));
    history = history[0];

    let stepOrder = await db.query(`SELECT stepOrder, description FROM recipeSteps WHERE recipesId = ${history["recipesId"]}`);

    stepOrder = JSON.parse(JSON.stringify(stepOrder));

    for await (let [index, data] of stepOrder.entries()) {
        if (index == 0) {
            stepOrder[index]["done"] = true;
        } else {
            stepOrder[index]["done"] = false;
        }
    }
    history["nStep"] = stepOrder.length;
    history["nStepDone"] = 1;
    history["steps"] = stepOrder;

    let dateNow = new Date();

    try {
        await db.query(`UPDATE recipes SET nServing = '${recipe.nServing + 1}', updatedAt = now() WHERE id = ${req.body.recipeId}`);
    } catch (err) {
        console.log(err)
        await res.status(500).send({
            msg: "error insert"
        })
    }

    await res.send({
        success: true,
        message: "success",
        data: {
            id: history.id,
            userId: history.userId,
            nServing: recipe.nServing + 1,
            recipeId: history.recipeId,
            recipeCategoryId: recipe.recipeCategoryId,
            recipeCategoryName: recipe.name,
            steps: stepOrder,
            nStep: stepOrder.length,
            nStepDone: 1,
            reaction: history.reaction,
            status: history.status,
            createdAt: recipe.createdAt,
            updatedAt: dateNow
        }
    })
});
router.put('/:id/done-steps', async (req, res, next) => {
    let serveHistory = await db.query(`SELECT * FROM cookingHistory WHERE id='${req.params.id}'`);
    if (!serveHistory.length) return res.status(500).send({
        success: false,
        message: "Serving History Not Found"
    })

    serveHistory = JSON.parse(JSON.stringify(serveHistory));
    serveHistory = serveHistory[0];

    let stepOrder = await db.query(`SELECT stepOrder, description FROM recipeSteps WHERE recipesId = ${serveHistory["recipesId"]}`);

    stepOrder = JSON.parse(JSON.stringify(stepOrder));

    let addition = "";
    let status = serveHistory.status;
    if (parseInt(req.body.stepOrder) == stepOrder.length) {
        addition += ", status='need-rating'";
        status = "need-rating";
    }

    let update = await db.query(`UPDATE cookingHistory SET stepDone = ${parseInt(req.body.stepOrder)} ` + addition + ` WHERE id = '${req.params.id}'`);
    if (update.affectedRows == 0) return res.status(500).send({
        success: false,
        message: "failed to update status"
    });

    let recipe = await db.query(`SELECT recipes.name as recipeName, recipes.image as image,recipes.nServing as nServing, recipes.image as image, recipes.createdAt as createdAt, categories.name as name FROM recipes INNER JOIN categories ON recipes.recipeCategoryId = categories.id AND recipes.id = ${serveHistory.recipesId} `);
    if (recipe.length == 0) return res.status(500).send({
        message: "recipe not found"
    });
    recipe = JSON.parse(JSON.stringify(recipe));
    recipe = recipe[0];

    for await (let [index, data] of stepOrder.entries()) {
        if (index + 1 <= parseInt(req.body.stepOrder)) {
            stepOrder[index]["done"] = true;
        } else {
            stepOrder[index]["done"] = false;
        }
    }

    await res.send({
        success: true,
        message: "success",
        data: {
            id: serveHistory.id,
            userId: serveHistory.userId,
            nServing: recipe.nServing + 1,
            recipeId: serveHistory.recipeId,
            recipeCategoryId: recipe.recipeCategoryId,
            recipeCategoryName: recipe.name,
            recipeName: recipe.recipeName,
            recipeImage: recipe.image,
            steps: stepOrder,
            nSteps: stepOrder.length,
            nStepDone: parseInt(req.body.stepOrder),
            reaction: serveHistory.reaction,
            status: status,
            createdAt: serveHistory.createdAt,
            updatedAt: serveHistory.updatedAt
        }
    })
});
router.post('/:id/reaction', async (req, res, next) => {
    let serveHistory = await db.query(`SELECT * FROM cookingHistory WHERE id='${req.params.id}'`);
    if (!serveHistory.length) return res.status(500).send({
        success: false,
        message: "Serving History Not Found"
    })


    serveHistory = JSON.parse(JSON.stringify(serveHistory));
    serveHistory = serveHistory[0];

    if (serveHistory.status != "need-rating") return res.status(500).send({
        success: false,
        message: "Rating is not allowed"
    })

    let stepOrder = await db.query(`SELECT stepOrder, description FROM recipeSteps WHERE recipesId = ${serveHistory["recipesId"]}`);

    stepOrder = JSON.parse(JSON.stringify(stepOrder));

    let allowedRating = ["like", "neutral", "dislike"];

    if (!allowedRating.includes(req.body.reaction)) return res.status(500).send({
        success: false,
        message: "reaction not allowed"
    })
    let update = await db.query(`UPDATE cookingHistory SET reaction = '${req.body.reaction}', status = 'done' WHERE id = '${req.params.id}'`);
    if (update.affectedRows == 0) return res.status(500).send({
        success: false,
        message: "failed to update status"
    });

    let recipe = await db.query(`SELECT recipes.name as recipeName, recipes.image as image, recipes.nServing as nServing, recipes.image as image, recipes.createdAt as createdAt, categories.name as name FROM recipes INNER JOIN categories ON recipes.recipeCategoryId = categories.id AND recipes.id = ${serveHistory.recipesId} `);
    if (recipe.length == 0) return res.status(500).send({
        message: "recipe not found"
    });
    recipe = JSON.parse(JSON.stringify(recipe));
    recipe = recipe[0];

    for await (let [index, data] of stepOrder.entries()) {
        stepOrder[index]["done"] = true;
    }

    await res.send({
        success: true,
        message: "success",
        data: {
            id: serveHistory.id,
            userId: serveHistory.userId,
            nServing: recipe.nServing,
            recipeId: serveHistory.recipeId,
            recipeCategoryId: recipe.recipeCategoryId,
            recipeCategoryName: recipe.name,
            recipeName: recipe.recipeName,
            recipeImage: recipe.image,
            steps: stepOrder,
            nStep: stepOrder.length,
            nStepDone: serveHistory.stepDone,
            reaction: req.body.reaction,
            status: serveHistory.status,
            createdAt: serveHistory.createdAt,
            updatedAt: serveHistory.updatedAt
        }
    })
});
router.get('/', async (req, res, next) => {
    try {
        let filters = " WHERE 1 ";
        if (typeof req.query.q !== "undefined" && req.query.q !== null) filters += "AND b.name like `%" + req.query.q + "%` ";
        if (typeof req.query.categoryId !== "undefined" && req.query.categoryId !== null) filters += "AND b.recipeCategoryId = " + req.query.categoryId + " ";
        if (typeof req.query.status !== "undefined" && req.query.status !== null) filters += "AND a.status = " + req.query.status + " ";
        if (typeof req.query.sort !== "undefined" && req.query.sort !== null) {
            switch (req.query.sort) {
                case "nserve_asc":
                    filters += " ORDER BY nServe asc";
                    break;
                case "nserve_desc":
                    filters += " ORDER BY nServe desc";
                    break;
                case "newest":
                    filters += " ORDER BY createdAt asc";
                    break;
                case "oldest":
                    filters += " ORDER BY createdAt desc";
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
        let result = await db.query(`SELECT a.id, b.nServing, a.reaction, a.status, a.recipesId as recipeId, b.name as recipeName, b.image as recipeImage, c.name as recipeCategoryName, a.stepDone as nStepDone, b.createdAt, b.updatedAt from cookingHistory as a inner join recipes as b on a.recipesId = b.id inner join categories as c on b.recipeCategoryId = c.id ` + filters + `;`);
        result = await JSON.parse(JSON.stringify(result));
        for await (let [index, data] of result.entries()) {
            let res = await db.query('SELECT count(*) as count FROM recipeSteps WHERE recipesId =' + data.recipeId + '');
            result[index]["nStep"] = res[0]["count"];
        }

        await res.status(200).json({
            success: true,
            message: 'success',
            data: {
                total: result.length,
                history: result
            }
        });
    } finally {
        if (db && db.end) db.end()
    }

})
router.get('/:id', async (req, res, next) => {
    let serveHistory = await db.query(`SELECT * FROM cookingHistory WHERE id='${req.params.id}'`);
    if (!serveHistory.length) return res.status(500).send({
        success: false,
        message: "Serving History Not Found"
    })


    serveHistory = JSON.parse(JSON.stringify(serveHistory));
    serveHistory = serveHistory[0];

    let stepOrder = await db.query(`SELECT stepOrder, description FROM recipeSteps WHERE recipesId = ${serveHistory["recipesId"]}`);

    stepOrder = JSON.parse(JSON.stringify(stepOrder));

    let recipe = await db.query(`SELECT recipes.name as recipeName, recipes.image as image, recipes.nServing as nServing, recipes.image as image, recipes.createdAt as createdAt, recipes.updatedAt, categories.name as name ,categories.id as recipeCategoryId FROM recipes INNER JOIN categories ON recipes.recipeCategoryId = categories.id AND recipes.id = ${serveHistory.recipesId} `);
    if (recipe.length == 0) return res.status(500).send({
        message: "recipe not found"
    });
    recipe = JSON.parse(JSON.stringify(recipe));
    recipe = recipe[0];
    console.log(recipe)

    for await (let [index, data] of stepOrder.entries()) {
        if (index + 1 <= serveHistory.stepDone) {
            stepOrder[index]["done"] = true;
        } else {
            stepOrder[index]["done"] = false;
        }
    }

    await res.send({
        success: true,
        message: "success",
        data: {
            id: serveHistory.id,
            userId: serveHistory.userId,
            nServing: recipe.nServing,
            recipeId: serveHistory.recipeId,
            recipeCategoryId: recipe.recipeCategoryId,
            recipeCategoryName: recipe.name,
            recipeName: recipe.recipeName,
            recipeImage: recipe.image,
            steps: stepOrder,
            nStep: stepOrder.length,
            nStepDone: serveHistory.stepDone,
            reaction: serveHistory.reaction,
            status: serveHistory.status,
            createdAt: recipe.createdAt,
            updatedAt: recipe.updatedAt
        }
    })
})
module.exports = router;