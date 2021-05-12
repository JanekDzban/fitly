require('dotenv').config();
const got = require('got');
const querystring = require('querystring');
const lodash = require('lodash');
const mappings = require('./mappings');

var settings = {
    url: 'https://panel.dietly.pl/api',
    username: process.env.DIETLY_USER,
    password: process.env.DIETLY_PASS,
    menuContent: Object.keys(mappings.dietlyToFitatuProduct)
};
settings.endpoints = {
    loginEndpoint: settings.url + '/auth/login',
    logoutEndpoint: settings.url + '/auth/logout',
    ordersEndpoint: settings.url + '/company/customer/orders', //+ active order Id
    menuEndpoint: settings.url + '/company/general/menus/delivery', //+ deliveryId
    companyEndpoint: settings.url + '/profile/companies/active'
};
settings.endpoints.activeOrderEndpoint = settings.endpoints.ordersEndpoint + '/active-ids';
settings.mealsOrder = Object.keys(mappings.dietlyToFitatuMeal);

var activeCompany = {};
var sessionId = '';

module.exports.login = async function() {
    const options = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: querystring.stringify(lodash.pick(settings, ['password','username']))
    };
    console.log(`Logging to dietly... (${settings.username})`);
    try {
        const response = await got.post(settings.endpoints.loginEndpoint, options);
        const sessionIdCookie = lodash.find(response.headers['set-cookie'], function(o) {return o.includes('JSESSIONID')});
        sessionId = sessionIdCookie.split(';')[0];
        console.log(`Login successful (${sessionId})`);
    } catch (e) {
        onError(e);
    }
}

module.exports.logout = async function() {
    console.log('Logout from dietly...')
    try {
        await got.post(settings.endpoints.logoutEndpoint);
        console.log('Logout successful');
    } catch (e) {
        onError(e);
    }
}

module.exports.getMenu = async function(date) {
    const orderId = await getActiveOrderId();
    const deliveries = await getDeliveries(orderId[0]);
    const deliveryToday = lodash.find(deliveries, function(o) {return o.date === date});
    if(!deliveryToday) {
        return null;
    }
    const menuData = await getMenuData(deliveryToday.deliveryId);
    const menu = lodash.map(menuData, function(o) {return lodash.pick(o, settings.menuContent)});
    menu.forEach(function(entry) {
        entry.meal = entry.meal.name;
        entry.brand = activeCompany.fullName;
    });
    return sortMenu(menu);
}

function sortMenu(menu) {
    var sortedMenu = [];
    settings.mealsOrder.forEach(function(meal) {
        var entry = lodash.find(menu, function(o) {return o.meal === meal});
        sortedMenu.push(entry);
    });
    return sortedMenu;
}

async function getActiveCompany() {
    const options = {
        headers: {
            'cookie': sessionId
        }
    }
    console.log("Getting active company data...");
    try {
        const companyData = await got.get(settings.endpoints.companyEndpoint, options).json();
        console.log(`Got data about ${companyData.fullName}`)
        return lodash.pick(companyData, ['companyName','fullName']);
    } catch (e) {
        onError(e);
    }
}

async function getActiveOrderId() {
    console.log('Getting active order id...');
    activeCompany = await getActiveCompany();
    const options = {
        headers: {
            'company-id': activeCompany.companyName,
            'cookie': sessionId
        }
    };
    try {
        const activeOrderId = await got.get(settings.endpoints.activeOrderEndpoint, options).json();
        console.log('Got active order id: ', activeOrderId);
        return activeOrderId;
    } catch (e) {
        onError(e);
    }
    
}

async function getDeliveries(activeOrderId) {
    console.log(`Getting deliveries for active order id ${activeOrderId}...`);
    const options = {
        headers: {
            'company-id': activeCompany.companyName,
            'cookie': sessionId
        }
    };
    try {
        const order = await got.get(`${settings.endpoints.ordersEndpoint}/${activeOrderId}`, options).json();
        console.log('Got order data');
        return lodash.map(order.deliveries, function(o) {return lodash.pick(o, ['deliveryId', 'date'])});
    } catch (e) {
        onError(e);
    }
}

async function getMenuData(deliveryId) {
    console.log(`Getting menu for delivery id ${deliveryId}...`);
    const options = {
        headers: {
            'company-id': activeCompany.companyName,
            'cookie': sessionId
        }
    };
    try {
        const menu = await got.get(`${settings.endpoints.menuEndpoint}/${deliveryId}`, options).json();
        console.log("Got menu")
        return menu;
    } catch(e) {
        onError(e);
    }
}

function onError(error) {
    console.log('Request failed:', error, error.response.body);
    process.exit(0);
}
