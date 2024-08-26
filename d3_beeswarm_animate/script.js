// Configuration des marges et des dimensions
const margin = { top: 20, right: 20, bottom: 100, left: 80 };
const width = 800 - margin.left - margin.right;
const height = 800 - margin.top - margin.bottom;

// Échelles de couleur et de taille
const colorScale = d3.scaleOrdinal()
    .domain(["Rural", "Intermédiaire (périurbain dense et centres ruraux)", "Urbain"])
    .range(["#27ae60", "#e67e22", "#2980b9"]);

const sizeScale = d3.scaleSqrt()
    .range([1, 15]);

// Création du SVG
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Création de l'infobulle
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

// Chargement des données
d3.csv("data.csv").then(data => {
    // Conversion des types de données
    data.forEach(d => {
        d.yes_pct = +d.yes_pct;
        d.voters = +d.voters;
    });

    // Mise à jour des domaines des échelles
    sizeScale.domain(d3.extent(data, d => d.voters));

    // Ajuster l'axe Y en fonction des données (sans aller jusqu'à 100)
    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.yes_pct) - 5, d3.max(data, d => d.yes_pct) + 5])
        .range([height, 0]);

    const yAxis = svg.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d => d + "%"));

    // Ajouter une ligne horizontale à 50%
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(50))
        .attr("y2", yScale(50))
        .attr("stroke", "lightgray")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 2");

    // Création de l'axe X initial (une seule catégorie "Tout")
    const xScale = d3.scaleBand()
        .domain(["Tout"])
        .range([0, width])
        .padding(0.5);

    const xAxis = svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));

    // Simulation de forces initiale
    const simulation = d3.forceSimulation(data)
        .force("x", d3.forceX(d => xScale("Tout") + xScale.bandwidth() / 2).strength(0.5))
        .force("y", d3.forceY(d => yScale(d.yes_pct)).strength(0.5))
        .force("collide", d3.forceCollide(d => sizeScale(d.voters) + 2))
        .alphaDecay(0.022)  // Augmente la friction pour stabiliser plus rapidement
        .stop();

    // Exécution de la simulation
    for (let i = 0; i < 200; i++) simulation.tick();

    // Dessin des cercles
    const circles = svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => sizeScale(d.voters))
        .attr("fill", d => colorScale(d.HR_GDETYP2012_L1_Name_fr))
        .attr("opacity", 0.8)
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`
                    <strong>Commune :</strong> ${d.name}<br>
                    <strong>Oui % :</strong> ${d3.format(".1f")(d.yes_pct)}%<br>
                    <strong>Votants :</strong> ${d.voters}<br>
                    <strong>Catégorie :</strong> ${d.HR_GDETYP2012_L1_Name_fr}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });

    // Gestion du toggle entre les deux états
    let state = "all"; // "all" pour toutes communes confondues, "grouped" pour par types

    d3.select("#toggleButton").on("click", () => {
        if (state === "all") {
            // Passage à l'état groupé
            state = "grouped";
            d3.select("#chart-title").text("Par types urbain-rural");
            d3.select("#toggleButton").text("Toutes communes confondues");

            // Mise à jour de l'axe X avec les nouvelles catégories
            xScale.domain(["Rural", "Intermédiaire (périurbain dense et centres ruraux)", "Urbain"]);

            xAxis.transition()
                .duration(2000)  // Ralentir la transition pour la rendre plus fluide
                .call(d3.axisBottom(xScale))
                .selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end");

            // Mise à jour de la simulation avec les nouvelles forces
            simulation
                .force("x", d3.forceX(d => xScale(d.HR_GDETYP2012_L1_Name_fr) + xScale.bandwidth() / 2).strength(0.7))  // Augmenter la force pour une transition plus rapide
                .alpha(0.5)  // Réinitialiser alpha pour relancer la simulation
                .restart();
        } else {
            // Retour à l'état toutes communes confondues
            state = "all";
            d3.select("#chart-title").text("Toutes communes confondues");
            d3.select("#toggleButton").text("Par types urbain-rural");

            // Mise à jour de l'axe X pour l'état initial
            xScale.domain(["Tout"]);

            xAxis.transition()
                .duration(2000)
                .call(d3.axisBottom(xScale))
                .selectAll("text")
                .attr("transform", null)
                .style("text-anchor", "middle");

            // Mise à jour de la simulation pour recentrer les points
            simulation
                .force("x", d3.forceX(d => xScale("Tout") + xScale.bandwidth() / 2).strength(0.5))
                .alpha(0.5)
                .restart();
        }

        // Animation des cercles vers les nouvelles positions
        simulation.on("tick", () => {
            circles
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });
    });
});
