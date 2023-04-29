const ingredients = ['milk', 'sugar', 'cornstarch', 'vanilla extract'];
const flavors = ['chocolate', 'strawberry', 'banana', 'butterscotch'];

function puddingRecipe() {
  const randomIngredients = ingredients.sort(() => 0.5 - Math.random()).slice(0, 3);
  const randomFlavor = flavors[Math.floor(Math.random() * flavors.length)];
  const recipe = `To make ${randomFlavor} pudding, combine ${randomIngredients[0]}, ${randomIngredients[1]}, and ${randomIngredients[2]} in a saucepan. Heat the mixture over medium heat, stirring constantly, until it thickens. Remove from heat and stir in ${randomFlavor} flavoring. Pour into individual serving dishes and chill in the refrigerator for at least an hour before serving.`;
  return recipe;
}

console.log(puddingRecipe());