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
    init(mapBox)
}

async function init(mapBox) {
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
        // Check if this is initial render or a rerender
        data.forEach(country => {
            plotBubbles(svg,country.featureObj,projection)
        })
        function plotBubbles(svg, data, projection) {
            projection = getD3(map);
            path.projection(projection)
            var radius = d3.scaleLinear()
                .domain([0, 10000])
                .range([10, 50]);

            svg
                .selectAll('circles')
                .data([data])
                .enter()
                .append('circle')
                .attr('class', 'country-circle')
                .attr('data-country', (d) => {
                    return d.country
                })
                .classed('clicked', (d) => {
                    if(d.flag == true) {
                        return true
                    } else {
                        return false
                    }
                })
                .attr('cx', (d) => { return projection(d.coordinates)[0] })
                .attr('cy', (d) => { return projection(d.coordinates)[1]; })
                .attr('r', (d) => { return radius(d.amount); })
                .on('mouseover', mouseoverHandler)
                .on('mouseleave', mouseleaveHandler)
                .on('click', mouseclickHandler)
        }

        function mouseclickHandler(item) {
            removeTooltip()
            data.forEach((d) => {
                if(d.featureObj.flag == true && this.dataset.country != d.featureObj.country) {
                    d.featureObj.flag = false
                } else if(d.featureObj.flag == true && this.dataset.country == d.country) {
                    console.log('komt in de elseif')
                    d.featureObj.flag = true
                }
            })
            if(item.flag == false) {
                d3.select(this).classed('clicked',true)
                const div = d3.select('#view-container').append('div')
                div
                    //TODO HTML STRUCTURE AANMAKEN VOOR TOOLTIP
                    .html('<h2>'+item.country+'</h2>')
                    .attr('class', 'country-tooltip')
                item.flag = true
            } else {
                d3.select(this).classed('clicked', false)
                d3.select('.country-tooltip').remove().exit()
                item.flag = false
            }
        }
    }
    function update() {
        data.forEach(country => {
            updateBubles(svg,country.featureObj,projection)
        })
        function updateBubles(svg, data, projection) {
            projection = getD3(map);
            path.projection(projection)
            const selection = d3.selectAll('.country-circle')
            selection._groups[0].forEach(circle => {
                if(data.country == circle.dataset.country) {
                    d3.select(circle)
                        .data([data])
                        .attr('cx', (d) => { return projection(d.coordinates)[0] })
                        .attr('cy', (d) => { return projection(d.coordinates)[1] })
                } else {
                    console.log('not the same')
                }
            })
        }
    }

    // Rerender map on move and viewreset
    map.on('viewreset', function() {
        update()
    })
    map.on('move', function() {
        update()
    })

    // render initial visualization
    render()
}

// Helper functions
function mouseoverHandler() {
    d3.select(this).classed('hovered',true)
}
function mouseleaveHandler() {
    d3.select(this).classed('hovered',false)
}
function removeTooltip() {
    d3.selectAll('.country-tooltip').remove().exit()
    d3.selectAll('.country-circle.clicked').classed('clicked', false)
}