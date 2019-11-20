// MAPBOX initialiseren
const d3 = require('d3')
const mapboxgl = require('mapbox-gl')
import {getFeatures} from "./fetchfeatures";

mapboxgl.accessToken = 'pk.eyJ1IjoiZGFtaWFudmVsdGthbXAiLCJhIjoiY2szNGdvcTA1MG0zYzNibnlyNW1nZWZreSJ9.fUYUVFTp1_PjhZ6HkC0SDQ'
const mapBox = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/damianveltkamp/ck372eqvz19fl1ctfeghxifun',
    center: [0,40],
    zoom: 1.8
})
buildMap(mapBox)
function buildMap(mapBox) {
    foo(mapBox)
}

async function foo(mapBox) {
    const d3settings = {
        projection: getD3(mapBox),
        path: d3.geoPath(),
        svg: d3.select(mapBox.getCanvasContainer()).append('svg')
    }
    const data = await getFeatures('/data/output/geoJsonData_0.json')
    renderD3(d3settings.projection,d3settings.path,d3settings.svg,mapBox,data)
}

function getD3(mapBox) {
    const bbox = document.body.getBoundingClientRect();
    const center = mapBox.getCenter();
    const zoom = mapBox.getZoom();

    // 512 is hardcoded tile size, might need to be 256 or changed to suit your map config
    const scale = (512) * 0.5 / Math.PI * Math.pow(2, zoom);

    const d3projection = d3.geoMercator()
        .center([center.lng, center.lat])
        .translate([bbox.width/2, bbox.height/2])
        .scale(scale);
    return d3projection;
}

function renderD3(projection,path,svg,map,data) {
    function render() {
        data.forEach(country => {
            console.log(country)
            plotBubbles(svg,country.featureObj,projection)
        })
        function plotBubbles(svg, data, projection) {
            projection = getD3(map);
            path.projection(projection)
            // TODO domain dynamisch aan de hand van de data populaten, niet hardcoded 10000 entries
            var radius = d3.scaleLinear()
                .domain([0, 10000])
                .range([5, 50]);

            svg
                .selectAll('circles')
                .data([data])
                .enter()
                .append('circle')
                .attr('class', data.country)
                .attr('cx', function (d) { return projection(d.coordinates)[0] })
                .attr('cy', function (d) { return projection(d.coordinates)[1]; })
                .attr("r", function(d) { return radius(d.amount); })
                .style('fill', '#002951')
        }
    }
    function remove() {
        svg.selectAll('circle').remove().exit()
    }
    map.on('viewreset', function() {
        // Remove old circle's and rerender
        remove()
        render()
    })
    map.on('move', function() {
        remove()
        render()
    })

    // render our initial visualization
    render()
}