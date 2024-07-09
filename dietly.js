require('dotenv').config({path: process.argv[3] || '.env'});
const got = require('got');
const querystring = require('querystring');
const lodash = require('lodash');
const mappings = require('./mappings');

var settings = {
    url: 'https://dietly.pl/api',
    username: process.env.DIETLY_USER,
    password: process.env.DIETLY_PASS,
    menuContent: Object.keys(mappings.dietlyToFitatuProduct)
};
settings.endpoints = {
    loginEndpoint: settings.url + '/auth/login',
    logoutEndpoint: settings.url + '/auth/logout',
    ordersEndpoint: settings.url + '/company/customer/order', //+ active order Id
    menuEndpoint: settings.url + '/company/general/menus/delivery', //+ deliveryId
    activeOrderEndpoint: settings.url + '/profile/profile-order/active-ids'
};
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
        const sessionIdCookie = lodash.find(response.headers['set-cookie'], function(o) {return o.includes('SESSION')});
        sessionId = sessionIdCookie.split(';')[0];
        console.log(`Login successful (${sessionId.substring(0,16)}...)`);
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
    const order = await getActiveOrder();
    activeCompany = lodash.pick(order, 'companyName', 'companyFullName');
    const deliveries = await getDeliveries(order.orderId);
    const deliveryToday = lodash.find(deliveries, function(o) {return o.date === date});
    if (!deliveryToday) {
        return null;
    }
    const menuData = await getMenuData(deliveryToday.deliveryId);
    const menu = lodash.map(menuData.deliveryMenuMeal, function(o) {return lodash.pick(o, settings.menuContent)});
    menu.forEach(function(entry) {
        entry.brand = order.companyFullName;
    });
    return sortMenu(menu);
}

function sortMenu(menu) {
    const sortedMenu = [];
    settings.mealsOrder.forEach(function(meal) {
        let entry = lodash.find(menu, function(o) {return o.mealName === meal});
        if (entry !== undefined) {
            sortedMenu.push(entry);
        }
    });
    return sortedMenu;
}

async function getActiveOrder() {
    console.log('Getting active order...');
    const options = {
        headers: {
            'cookie': sessionId
        }
    };
    try {
        const orders = await got.get(settings.endpoints.activeOrderEndpoint, options).json();
        const order = orders[0];
        console.log(`Got active order id ${order.orderId} for company ${order.companyFullName}`);
        return order;
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
        console.log("Got menu");
        return menu;
    } catch(e) {
        onError(e);
    }
}

function onError(error) {
    console.log('Request failed:', error, error.response.body);
    process.exit(0);
}
