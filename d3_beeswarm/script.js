// Set up responsive SVG dimensions
const margin = { top: 20, right: 20, bottom: 100, left: 80 };
const width = Math.min(800, window.innerWidth - 40); // Responsive width
const height = 800; // Fixed height as requested

// Create scales
const x = d3.scaleBand()
    .domain(["Rural", "Intermédiaire (périurbain dense et centres ruraux)", "Urbain"])
    .range([margin.left, width - margin.right])
    .padding(0.1);

const y = d3.scaleLinear()
    .range([height - margin.bottom, margin.top]);

const size = d3.scaleSqrt()
    .range([1, 15]);

const color = d3.scaleOrdinal()
    .domain(["Rural", "Intermédiaire (périurbain dense et centres ruraux)", "Urbain"])
    .range(["green", "orange", "steelblue"]);

// Set up SVG
const svg = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

// Create tooltip
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip");

// Load the CSV data
d3.csv("data.csv").then(data => {
    // Parse data types
    data.forEach(d => {
        d.yes_pct = +d.yes_pct;
        d.voters = +d.voters;
    });

    // Update scales' domains based on data
    y.domain([0, d3.max(data, d => d.yes_pct)]);
    size.domain(d3.extent(data, d => d.voters));

    // Create x-axis
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("y", 10)
        .attr("x", -5)
        .attr("dy", ".35em")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // Create y-axis
    svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(10))
        .call(g => g.select(".domain").remove());

    // Force simulation
    const simulation = d3.forceSimulation(data)
        .force("x", d3.forceX(d => x(d.HR_GDETYP2012_L1_Name_fr) + x.bandwidth() / 2).strength(1))
        .force("y", d3.forceY(d => y(d.yes_pct)).strength(0.1))
        .force("collide", d3.forceCollide(d => size(d.voters) + 2).strength(1))
        .stop();

    // Run simulation
    for (let i = 0; i < 300; ++i) simulation.tick(); // Increase ticks for better spacing

    // Draw circles
    svg.append("g")
        .selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => size(d.voters))
        .attr("fill", d => color(d.HR_GDETYP2012_L1_Name_fr))
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Commune: ${d.name}<br>Oui %: ${d3.format(".1f")(d.yes_pct)}%<br>Voters: ${d.voters}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.transition().duration(500).style("opacity", 0);
        });
});
