const lodash = require('lodash');

//fitatu names: breakfast, second_breakfast, lunch, dinner, snack, supper
module.exports.dietlyToFitatuMeal = {
    'Śniadanie': 'breakfast',
    'II śniadanie': 'breakfast',
    'Obiad': 'dinner',
    'Podwieczorek': 'dinner',
    'Kolacja': 'snack',
    'Przekąska okołotreningowa' : 'snack'
};

module.exports.dietlyToFitatuProduct = {
    'mealName': '_meal',
    'menuMealName': 'name',
    'brand': 'brand',
    'weight': '_weight',
    'calories': 'energy',
    'protein': 'protein',
    'fat': 'fat',
    'carbohydrate': 'carbohydrate',
    'saturatedFattyAcids': 'saturatedFat',
    'sugar': 'sugars',
    'dietaryFiber': 'fiber',
    'salt': 'salt',
    'ingredients': '_rawIngredients'
};

module.exports.mapDietlyToFitatuProducts = function(menu) {
    const products = [];
    menu = lodash.compact(menu);
    menu.forEach(function(entry) {
        const product = {};
        for (const [dietlyProp, fitatuProp] of Object.entries(module.exports.dietlyToFitatuProduct)) {
            lodash.set(product, fitatuProp, entry[dietlyProp]);
            product[fitatuProp] = entry[dietlyProp];
        }
        product.measures = [{
            measureKey: 'PACKAGE', 
            measureUnit: 'g', 
            weight: Math.round(product._weight)
        }];
        delete product._weight;
        product._rawIngredients = lodash.join(lodash.map(product._rawIngredients, 'name'), ',');
        products.push(product);
    });
    return products;
}