const d3 = require('d3')
const mapboxgl = require('mapbox-gl')
import {getFeatures} from "./fetchfeatures";
import {normalize} from "./utilities/helpers"

mapboxgl.accessToken = 'pk.eyJ1IjoiZGFtaWFudmVsdGthbXAiLCJhIjoiY2szNGdvcTA1MG0zYzNibnlyNW1nZWZreSJ9.fUYUVFTp1_PjhZ6HkC0SDQ'
const mapBox = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/damianveltkamp/ck372eqvz19fl1ctfeghxifun',
    center: [0,40],
    zoom: 1.8
})
mapBox.dragRotate.disable();
mapBox.touchZoomRotate.disableRotation();

const pieSettings = {
    margin: 0,
    width: 350,
    height: 350,
    radius: Math.min(350, 350) / 2 - 0
}

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
                resetPie(item,div)
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
    const piechartSvg = div
        .append('svg')
        .attr('class', 'pie-svg')
        .attr('width', pieSettings.width)
        .attr('height', pieSettings.height)
        .append('g')
        .attr('transform', 'translate(' + pieSettings.width / 2 + ',' + pieSettings.height / 2 + ')');

    const pie = d3.pie()
        .value(function(d) { return d.value.amount; })
    const data_ready = pie(d3.entries(item.weaponObj))
    const arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(pieSettings.radius)

    piechartSvg
        .selectAll('path')
        .data(data_ready)
        .enter()
        .append('path')
        .attr('d', arcGenerator)
        .attr('fill', function(d){
            return d.data.value.categoryname == 'unknown' ? '#FF757B' :
            d.data.value.categoryname == 'vuurwapens' ? '#499DCC' :
            d.data.value.categoryname == 'spangeschut' ? '#B33037' :
            d.data.value.categoryname == 'werpwapen' ? '#FFFC8F' : console.log('Cultural object has not been placed in a category', d.data)
        })
        .attr('stroke', '#fff')
        .style('stroke-width', '2px')
        .on('click', updatePie)

    piechartSvg
        .selectAll('text')
        .data(data_ready)
        .enter()
        .append('text')
        .text(function(d){
            return (d.data.value.amount != 0) ? d.data.value.categoryname : console.log('no value found' , d)
        })
        .attr('transform', function(d) { return 'translate(' + arcGenerator.centroid(d) + ')';  })
        .style('text-anchor', 'middle')
        .style('font-size', 17)
        .style('fill', '#fff')
        .on('click', updatePie)
    return div
}

function resetPie(item,div) {
    div
        .append('button')
        .text('reset pie')
        .classed('pie-reset', true)
    const button = document.querySelector('.pie-reset')
    button.addEventListener('click', () => {
        const piechartSvg = d3.select('g')
        const pie = d3.pie()
            .value(function(d) { return d.value.amount })
        const data_ready = pie(d3.entries(item.weaponObj))
        const arcGenerator = d3.arc()
            .innerRadius(0)
            .outerRadius(pieSettings.radius)

        piechartSvg
            .selectAll('path')
            .data(data_ready)
            .attr('d', arcGenerator)
            .attr('fill', function(d){
                return d.data.value.categoryname == 'unknown' ? '#FF757B' :
                    d.data.value.categoryname == 'vuurwapens' ? '#499DCC' :
                        d.data.value.categoryname == 'spangeschut' ? '#B33037' :
                            d.data.value.categoryname == 'werpwapen' ? '#FFFC8F' : console.log('Cultural object has not been placed in a category', d.data)
            })
            .enter()
            .append('path')
            .attr('d', arcGenerator)
            .attr('fill', function(d){
                return d.data.value.categoryname == 'unknown' ? '#FF757B' :
                    d.data.value.categoryname == 'vuurwapens' ? '#499DCC' :
                        d.data.value.categoryname == 'spangeschut' ? '#B33037' :
                            d.data.value.categoryname == 'werpwapen' ? '#FFFC8F' : console.log('Cultural object has not been placed in a category', d.data)
            })
            .attr('stroke', '#fff')
            .style('stroke-width', '2px')

        piechartSvg
            .selectAll('path')
            .data(data_ready)
            .exit()
            .remove()

        piechartSvg
            .selectAll('text')
            .data(data_ready)
            .text(function(d){
                return d.data.value.categoryname
            })
            .attr('transform', function(d) { return 'translate(' + arcGenerator.centroid(d) + ')';  })
            .enter()
            .append('text')
            .text(function(d){
                return d.data.value.categoryname
            })
            .attr('transform', function(d) { return 'translate(' + arcGenerator.centroid(d) + ')';  })
            .style('text-anchor', 'middle')
            .style('fill', '#fff')
            .style('font-size', 17)

        piechartSvg
            .selectAll('text')
            .data(data_ready)
            .exit()
            .remove()
    })
    return div
}
function updatePie(item) {
    const piechartSvg = d3.select('g')
    const pie = d3.pie()
        .value(function(d) { return d.value.amount })
    const data_ready = pie(d3.entries(item.data.value.weaponnames))
    const arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(pieSettings.radius)
    const max = item.data.value.weaponnames.reduce(function(current, previous) {
        return {amount: Math.max(current.amount, previous.amount)}
    })
    const min = item.data.value.weaponnames.reduce(function(current, previous) {
        return {amount: Math.min(current.amount, previous.amount)}
    })
    console.log(item)
    piechartSvg
        .selectAll('path')
        .data(data_ready)
        .attr('d', arcGenerator)
        .attr('fill', function(d){
            if(item.data.value.categoryname == 'vuurwapens' && !(min.amount == max.amount)) {
                return `rgba(73,157,204,${normalize(d.data.value.amount, min.amount,max.amount)})`
            } else if(item.data.value.categoryname == 'vuurwapens' && (min.amount == max.amount)) {
                return `rgb(73,157,204)`
            } else if(item.data.value.categoryname == 'spangeschut' && !(min.amount == max.amount)){
                console.log('heeeeeeey 1 ', min.amount, max)
                return `rgba(179,48,55,${normalize(d.data.value.amount, min.amount,max.amount)})`
             } else if (item.data.value.categoryname == 'spangeschut' && (min.amount == max.amount)) {
                return `rgb(179,48,55)`
            }
        })
        .enter()
        .append('path')
        .attr('d', arcGenerator)
        .attr('fill', function(d){
            if(item.data.value.categoryname == 'vuurwapens' && !(min.amount == max.amount)) {
                return `rgba(73,157,204,${normalize(d.data.value.amount, min.amount,max.amount)})`
            } else if(item.data.value.categoryname == 'vuurwapens' && (min.amount == max.amount)) {
                return `rgb(73,157,204)`
            } else if(item.data.value.categoryname == 'spangeschut' && !(min.amount == max.amount)){
                console.log('heeeeeeey 2')
                return `rgba(179,48,55,${normalize(d.data.value.amount, min.amount,max.amount)})`
            } else if (item.data.value.categoryname == 'spangeschut' && (min.amount == max.amount)) {
                return `rgb(179,48,55)`
            }
        })
        .attr('stroke', '#fff')
        .style('stroke-width', '2px')

    piechartSvg
        .selectAll('path')
        .data(data_ready)
        .exit()
        .remove()

    piechartSvg
        .selectAll('text')
        .data(data_ready)
        .text(function(d){
            return d.data.value.weaponname
        })
        .attr('transform', function(d) { return 'translate(' + arcGenerator.centroid(d) + ')';  })
        .enter()
        .append('text')
        .text(function(d){
            return d.data.value.weaponname
        })
        .attr('transform', function(d) { return 'translate(' + arcGenerator.centroid(d) + ')';  })
        .style('text-anchor', 'middle')
        .style('fill', '#fff')
        .style('font-size', 17)

    piechartSvg
        .selectAll('text')
        .data(data_ready)
        .exit()
        .remove()
}

function constructTooltipHeader(item,div) {
    div
        .append('h2')
        .text(item.featureObj.country)
    return div
}

function constructWeaponList(item,div) {
    const ul = div.append('ul')
    item.weaponObj.map(weapon => {
        console.log(weapon)
        // TODO List bouwen met wapen type en aantal
        ul.append('li').text('Aantal gevonden ' + weapon.categoryname + ' wapens ' + weapon.amount)
    })
    return div
}

function constructTooltipParagraph(item,div) {
    const output = 'Hier ziet u de wapen collectie van ' + item.featureObj.country + '.'
    div.append('p').text(output)
    return div
}