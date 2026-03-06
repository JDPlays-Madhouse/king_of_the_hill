import { weaponObjects, displayName } from "./koth/weapons.js";

let display = document.getElementById("display");

let text = "";

for (const weaponName in weaponObjects) {
    let weapon = weaponObjects[weaponName];
    text += `${displayName(weapon)}<br>`;
}

display.innerHTML = text;
