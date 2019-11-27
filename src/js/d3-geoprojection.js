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
mapBox.dragRotate.disable();
mapBox.touchZoomRotate.disableRotation();

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
        data.forEach(country => {
            plotBubbles(svg,country,projection)
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
                    return d.featureObj.country
                })
                .classed('clicked', (d) => {
                    return d.featureObj.flag == true ? true : false
                })
                .attr('cx', (d) => { return projection(d.featureObj.coordinates)[0] })
                .attr('cy', (d) => { return projection(d.featureObj.coordinates)[1]; })
                .attr('r', (d) => { return radius(d.featureObj.amount); })
                .on('mouseover', mouseoverHandler)
                .on('mouseleave', mouseleaveHandler)
                .on('click', mouseclickHandler)
        }

        function mouseclickHandler(item) {
            removeTooltip()
            data.forEach((d) => {
                (d.featureObj.flag == true && this.dataset.country != d.featureObj.country) ? d.featureObj.flag = false :
                    (d.featureObj.flag == true && this.dataset.country == d.country) ? d.featureObj.flag = true : ''
            })
            if(item.featureObj.flag == false) {
                d3.select(this).classed('clicked',true)
                const div = d3.select('#view-container').append('div')
                div
                    .attr('class', 'country-tooltip')
                constructTooltipHeader(item,div)
                constructTooltipParagraph(item,div)
                constructWeaponChart(item,div)
                constructWeaponList(item,div)
                setTimeout(function(){ div.classed('loaded',true) }, 100);
                item.featureObj.flag = true
            } else {
                d3.select(this).classed('clicked', false)
                d3.select('.country-tooltip').remove().exit()
                item.featureObj.flag = false
            }
        }
    }
    function update() {
        data.forEach(country => {
            updateBubles(svg,country,projection)
        })
        function updateBubles(svg, data, projection) {
            projection = getD3(map);
            path.projection(projection)
            const selection = d3.selectAll('.country-circle')
            selection._groups[0].forEach(circle => {
                (data.featureObj.country == circle.dataset.country) &&
                    d3.select(circle)
                        .data([data])
                        .attr('cx', (d) => { return projection(d.featureObj.coordinates)[0] })
                        .attr('cy', (d) => { return projection(d.featureObj.coordinates)[1] })
            })
        }
    }

    map.on('viewreset', function() {
        update()
    })
    map.on('move', function() {
        update()
    })

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

// TODO Refactor tooltip chart code
function constructWeaponChart(item,div) {
    const width = 350
    const height = 350
    const margin = 0
    const radius = Math.min(width, height) / 2 - margin

    // Add svg to the tooltip div
    const piechartSvg = div
        .append('svg')
        .attr('class', 'pie-svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

    const pie = d3.pie()
        .value(function(d) {return d.value; })
    const data_ready = pie(d3.entries(item.weaponObj))

    const arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(radius)

    piechartSvg
        .selectAll('slices')
        .data(data_ready)
        .enter()
        .append('path')
        .attr('d', arcGenerator)
        .attr('fill', function(d){
            return d.data.key == 'unknown' ? '#FF757B' :
            d.data.key == 'vuurwapens' ? '#499DCC' :
            d.data.key == 'spangeschut' ? '#B33037' :
            d.data.key == 'werpwapen' ? '#FFFC8F' : console.log('Cultural object has not been placed in a category', d.data)
        })
        .attr('stroke', '#fff')
        .style('stroke-width', '2px')

    piechartSvg
        .selectAll('slices')
        .data(data_ready)
        .enter()
        .append('text')
        .text(function(d){
            return d.data.key
        })
        .attr('transform', function(d) { return 'translate(' + arcGenerator.centroid(d) + ')';  })
        .style('text-anchor', 'middle')
        .style('font-size', 17)

    return div
}

function constructTooltipHeader(item,div) {
    div
        .append('h2')
        .text(item.featureObj.country)
    return div
}

function constructWeaponList(item,div) {
    const entries = Object.entries(item.weaponObj)
    const ul = div.append('ul')
    entries.map(weapon => {
        // TODO List bouwen met wapen type en aantal
        ul.append('li').text(weapon[0] + ' ' + weapon[1])
    })
    return div
}

function constructTooltipParagraph(item,div) {
    const output = 'Hier ziet u de wapen collectie van ' + item.featureObj.country + '.'
    div.append('p').text(output)
    return div
}