const fs = require('fs');
const path = require('path');

// 64x64 valid PNG buffer
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAENSURBVHgB7dlRDsIgEITh/pfrf08j2cZq6kLCsLu81ySNmZjdhzI8Lcsy59xaa7u8+9Vaa6+829Vv57z/l8Vp7X0Pzjl7e/8lRkU4+qgIRx8V4eijIhx9VISjj4pw9FERjj4qwtFHRTj6qAhHHxXh6KMiHH1UhKOPinD0URGOPirC0UdFOPqoCEcfFeHoorp6zjl1zh19/1UfFeHoorp6d/Xo4/6rPvv47ePXx7VPRTj6qAhHHxXh6KMiHH1UhKOPinD0URGOPirC0UdFOPqoCEcfFeHoorp6d/Xo4/6rPvv47ePXx7VPRTj6qAhHHxXh6KMiHH1UhKOPinD0URGOPirC0UdFOPqoCEcfFeHoorp6d/Xo4/6r/gG5P9Bw+t75/gAAAABJRU5ErkJggg==';

const buffer = Buffer.from(base64Png, 'base64');
const target = path.join(__dirname, '../assets/icon.png');
fs.writeFileSync(target, buffer);
console.log('Icon created at:', target);
