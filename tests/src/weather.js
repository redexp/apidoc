/**
 * @url GET /data/:version/weather
 * @query {
 *     [q]: 'a' || 'b',
 *     appid: string,
 * }
 * @response {
 *     coord: {
 *         lon: 1 || 2, // some comment 1!@#$%^&*()
 *         lat: number,
 *     },
 *     // comment 3
 *     weather: [ // comment 2.1
 *     { // comment 2.2
 *         id: number,
 *         main: string,
 *         description: string,
 *         icon: string,
 *     }],
 * }
 * @call weather.get()
 */

var response = {
	"coord": {"lon": -0.13, "lat": 51.51},
	"weather": [{"id": 300, "main": "Drizzle", "description": "light intensity drizzle", "icon": "09d"}],
	"base": "stations",
	"main": {"temp": 280.32, "pressure": 1012, "humidity": 81, "temp_min": 279.15, "temp_max": 281.15},
	"visibility": 10000,
	"wind": {"speed": 4.1, "deg": 80},
	"clouds": {"all": 90},
	"dt": 1485789600,
	"sys": {"type": 1, "id": 5091, "message": 0.0103, "country": "GB", "sunrise": 1485762037, "sunset": 1485794875},
	"id": 2643743,
	"name": "London",
	"cod": 200
};