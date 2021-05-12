const dietly = require('./dietly');
const fitatu = require('./fitatu');

(async() => {
    const day = process.argv[2];
    if(day == null) {
        day = new Date().toISOString().slice(0, 10);
    }
    const menu = await getMenuFromDietly(day);
    addMenuToFitatu(menu, day);
})();

async function getMenuFromDietly(date) {
    await dietly.login();
    const menu = await dietly.getMenu(date);
    await dietly.logout();

    if(menu) {
        console.log('Menu: ', menu);
    } else {
        console.log(`There is no delivery planned for ${date}`);
        process.exit(0);
    }
    return menu;
}

async function addMenuToFitatu(menu, date) {
    await fitatu.login();
    await fitatu.addMeals(menu, date);
    await fitatu.logout();
}