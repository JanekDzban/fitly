require('dotenv').config({path: process.argv[3] || '.env'});
const got = require('got');
const lodash = require('lodash');
const jwtDecode = require('jwt-decode');
const uuid = require('uuid');
const mappings = require('./mappings');

var settings = {
    url: 'https://pl-pl.fitatu.com/api',
    username: process.env.FITATU_USER,
    password: process.env.FITATU_PASS,
    mealQuantity: parseFloat(process.env.FITATU_MEAL_SIZE),
    options: {
        headers: {
            'api-secret': 'PYRXtfs88UDJMuCCrNpLV',
            'api-key': 'FITATU-MOBILE-APP',
            'content-type': 'application/json;charset=UTF-8'
        }
    }
};
settings.endpoints = {
    'loginEndpoint': settings.url + '/login', //returns token
    'addProductEndpoint': settings.url + '/products',
    'addIngredientsUrl': 'proposals', //product endpoint + productId + actual endpoint
    'addMealEndpoint': settings.url + '/diet-plan' // +/userid/days
};

module.exports.login = async function() {
    const options = settings.options;
    options.json = {
        _username: settings.username,
        _password: settings.password
    }
    console.log(`Logging to fitatu... (${settings.username})`);
    try {
        const response = await got.post(settings.endpoints.loginEndpoint, options).json();
        settings.options.headers.authorization = 'Bearer ' + response.token;
        settings.userid = jwtDecode(response.token).id;
        console.log(`Login successful (${response.token.substring(0,16)}...)`);
    } catch(e) {
        onError(e);
    }
}

module.exports.logout = async function() {
    console.log('### fitatu logout not supported :( ###');
}

module.exports.addMeals = async function(menu, date) {
    const products = mappings.mapDietlyToFitatuProducts(menu);
    for (product of products) {
        product.id = await addProduct(product);
        await addMeal(product, date);
    }
}

async function addMeal(product, date) {
    const options = settings.options;
    const mealName = mappings.dietlyToFitatuMeal[product._meal];
    const item = {
        planDayDietItemId: uuid.v1(),
        measureId: 2,
        measureQuantity: settings.mealQuantity,
        productId: product.id,
        foodType: 'PRODUCT',
        source: 'API'
    }
    options.json = {
        [date]: {
            dietPlan: {
                [mealName]: {
                    items: [
                        item
                    ]
                }
            }
        }
    }
    const url = `${settings.endpoints.addMealEndpoint}/${settings.userid}/days`;
    console.log(`Adding product to meal... (${product.name}, ${date}, ${mealName})`);
    try {
        const response = await got.post(url, options).json();
        console.log(`Added to meal successfully (${response.planDayDietItemId})`);
    } catch(e) {
        onError(e);
    }

}

async function addProduct(product) {
    const options = settings.options;
    const notProcessedProps = lodash.filter(Object.keys(product), function(o) {return o.startsWith('_')});
    options.json = lodash.omit(product, notProcessedProps);
    console.log(`Adding new product to database... (${product.name})`);
    try {
        const response = await got.post(settings.endpoints.addProductEndpoint, settings.options).json();
        console.log(`Product added successfully (${response.id})`);
        product.id = response.id;
        await addIngredients(product);
        return response.id;
    } catch(e) {
        onError(e);
    }
}

async function addIngredients(product) {
    const options = settings.options;
    options.json = {
        propertyName: 'rawIngredients',
        propertyValue: product._rawIngredients
    };
    console.log('Adding ingredients data...');
    try {
        const url = `${settings.endpoints.addProductEndpoint}/${product.id}/${settings.endpoints.addIngredientsUrl}`;
        const response = await got.post(url, options).json();
        console.log(`Ingredients data added successfully (${response.id})`);
    } catch(e) {
        onError(e);
    }
}

function onError(error) {
    console.log('Request failed:', error, error.response.body);
    process.exit(0);
}
