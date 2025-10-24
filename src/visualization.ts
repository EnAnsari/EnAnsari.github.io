import * as d3 from 'd3';
import * as assert from "assert";
import {Tooltip} from "./tooltip";

export interface Node extends d3.SimulationNodeDatum {
    id: string;
    image: string;
    description: string;
    relSize: number;
    relDistance: number;
    x?: number;
    y?: number;
}

export interface Link extends d3.SimulationLinkDatum<Node> {
    source: Node; // parent
    target: Node; // child
}

export class GraphVisualizer {
    private readonly nodes: Node[] = [];
    private readonly links: Link[] = [];
    private config: { linkDistanceUnit: number, chargeStrength: number, circleRadiusUnit: number };
    private readonly simulation;
    // This hideTask is part of the original project's logic
    private hideTask: () => void;

    public constructor(
        // Changed back to SVGSVGElement, removing the zoom container
        private readonly container: SVGSVGElement,
    ) {
        // Calculate initial size factor
        const sizeFactor = Math.min(this.container.clientWidth, this.container.clientHeight) / 1000;
        this.config = this.calculateConfig(sizeFactor);

        this.simulation = d3.forceSimulation<Node, Link>(this.nodes)
            .on('tick', () => this.ticked());
        
        this.applyAllForces();
        this.simulation.velocityDecay(0.05);

        // Initialize hideTask as an empty function
        this.hideTask = () => {};

        // Keep the resize functionality from the original project
        this.registerResize();
    }
    
    // Helper function to calculate config
    private calculateConfig(sizeFactor: number) {
        return {
            linkDistanceUnit: 300 * sizeFactor,
            circleRadiusUnit: 80 * sizeFactor,
            chargeStrength: -60 * sizeFactor
        };
    }

    public addNode(node: Node) {
        this.nodes.push(node);
        this.update();
    }

    public addLink(link: Link) {
        this.links.push(link);
        this.update();
    }

    private update() {
        // Select the main SVG container directly
        const svgSelection = d3.select(this.container);

        svgSelection
            .selectAll<SVGGElement, Node>('.node')
            .data(this.nodes, d => d.id)
            .join(
                enter => {
                    const nodeEnter = enter
                        .append('g')
                        .attr('class', 'node')
                        .call(d3.drag<SVGGElement, Node>()
                            .on('start', (event, node) => this.dragstarted(event, node))
                            .on('drag', (event, node) => this.dragged(event, node))
                            .on('end', (event, node) => this.dragended(event, node)))
                        .append('g')
                        .attr('class', 'inner-node');

                    nodeEnter // white background
                        .append('circle')
                        .attr('r', d => d.relSize * this.config.circleRadiusUnit)
                        .attr('fill', d => 'white');

                    nodeEnter // image background
                        .append('circle')
                        .attr('r', d => d.relSize * this.config.circleRadiusUnit)
                        .attr('fill', d => `url(#${'pattern' + d.id})`);

                    // Create image patterns for each node
                    nodeEnter.each(d =>
                        svgSelection // Append defs to the main SVG
                            .append('defs')
                            .append('pattern')
                            .attr('id', 'pattern' + d.id)
                            .attr('patternUnits', 'userSpaceOnUse')
                            .attr('x', -d.relSize * this.config.circleRadiusUnit)
                            .attr('y', -d.relSize * this.config.circleRadiusUnit)
                            .attr('width', d.relSize * this.config.circleRadiusUnit * 2)
                            .attr('height', d.relSize * this.config.circleRadiusUnit * 2)
                            .append("image")
                            .attr("xlink:href", d.image)
                            .attr('width', d.relSize * this.config.circleRadiusUnit * 2)
                            .attr('height', d.relSize * this.config.circleRadiusUnit * 2)
                    );

                    // --- START: Original Tooltip Logic ---
                    // This logic is restored from the shayan-p project
                    
                    // Create a new tooltip for each node
                    let tip = new Tooltip();
                    document.body.appendChild(tip.getNode());

                    let that = this;
                    let showTimeout: NodeJS.Timeout;

                    // If mouse moves over the tooltip, cancel the hide timer
                    tip.getNode().onmouseover = (() => {
                        clearTimeout(showTimeout);
                    });

                    // If mouse moves off the tooltip, set a timer to hide it
                    tip.getNode().onmouseout = ( () => {
                        showTimeout = setTimeout(this.hideTask, 800);
                    });

                    nodeEnter.filter((d: Node) => {
                        return d.description !== undefined && d.description.length > 0;
                    })
                    .on('mouseover', function (event, d) {
                        // On mouseover, clear any pending hide timers
                        clearTimeout(showTimeout);
                        // Set data and show
                        tip.setData(event, d, that.config.circleRadiusUnit);
                        that.hideTask(); // Hide any other active tip
                        tip.show();
                    })
                    .on('mouseout', function () {
                        // On mouseout, set a timer to hide the tip
                        that.hideTask = () => tip.hide();
                        showTimeout = setTimeout(that.hideTask, 800);
                    });
                    // --- END: Original Tooltip Logic ---

                    return nodeEnter;
                },
                undefined,
                exit => exit.remove()
            );

        svgSelection
            .selectAll<SVGLineElement, Link>('.link')
            .data(this.links, (d) => `${d.source.id}-${d.target.id}`)
            .join(
                enter => enter
                    .append('line')
                    .attr('class', 'link'),
                update => update,
                exit => exit.remove()
            );

        // Update the simulation
        this.simulation.nodes(this.nodes);
        this.simulation.force('link', d3.forceLink<Node, Link>(this.links).strength(0.07)
            .distance((link) => link.target.relDistance * this.config.linkDistanceUnit));
        this.simulation.alpha(0.3).restart();

        // re-order line and nodes
        svgSelection.selectAll<SVGLineElement, Link>('.link')
            .each(function () {
                const linkElement = this;
                linkElement.parentNode?.insertBefore(linkElement, linkElement.parentNode.firstChild);
            });
    }

    private selectLinks() {
        // Select from the main SVG container
        return d3.select(this.container).selectAll<SVGLineElement, Link>('.link').data(this.links);
    }

    private selectNodes() {
        // Select from the main SVG container
        return d3.select(this.container).selectAll<SVGGElement, Node>('.node').data(this.nodes);
    }

    private dragstarted(event: any, d: Node) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = event.x;
        d.fy = event.y;
    }

    private dragged(event: any, d: Node) {
        d.fx = event.x;
        d.fy = event.y;
    }

    private dragended(event: any, d: Node) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    private ticked() {
        // This function updates the x/y attributes directly, no zoom transform needed
        this.selectLinks()
            .attr('x1', (d) => d.source?.x ?? assert.fail())
            .attr('y1', (d) => d.source?.y ?? assert.fail())
            .attr('x2', (d) => d.target?.x ?? assert.fail())
            .attr('y2', (d) => d.target?.y ?? assert.fail());

        this.selectNodes()
            .attr('transform', (d) => `translate(${d.x}, ${d.y})`);
    }

    private registerResize() {
        let lastResizeTimeout: NodeJS.Timeout | undefined;

        // Observe the main SVG element for size changes
        const resizeObserver = new ResizeObserver(() => {
            if (lastResizeTimeout !== undefined) {
                clearTimeout(lastResizeTimeout);
            }
            // Set a new timeout to execute the resize logic
            lastResizeTimeout = setTimeout(() => {
                // Recalculate config based on new size
                const sizeFactor = Math.min(this.container.clientWidth, this.container.clientHeight) / 1000;
                this.config = this.calculateConfig(sizeFactor);
                
                // Re-apply forces with new config
                this.applyAllForces();
                
                // Update node circles with new radius
                this.selectNodes().selectAll('circle')
                    .attr('r', d => d.relSize * this.config.circleRadiusUnit);
                    
                // Update image pattern definitions
                d3.select(this.container).selectAll('defs').remove(); // Clear old defs
                this.selectNodes().each(d => { // Re-create defs
                    d3.select(this.container)
                        .append('defs')
                        .append('pattern')
                        .attr('id', 'pattern' + d.id)
                        .attr('patternUnits', 'userSpaceOnUse')
                        .attr('x', -d.relSize * this.config.circleRadiusUnit)
                        .attr('y', -d.relSize * this.config.circleRadiusUnit)
                        .attr('width', d.relSize * this.config.circleRadiusUnit * 2)
                        .attr('height', d.relSize * this.config.circleRadiusUnit * 2)
                        .append("image")
                        .attr("xlink:href", d.image)
                        .attr('width', d.relSize * this.config.circleRadiusUnit * 2)
                        .attr('height', d.relSize * this.config.circleRadiusUnit * 2);
                });
                
                // Restart simulation
                this.simulation.alpha(1).restart();
                lastResizeTimeout = undefined;
            }, 500);
        });
        resizeObserver.observe(this.container);
    }

    private applyCenterForce() {
        this.simulation.force('center', d3.forceCenter(this.container.clientWidth / 2, this.container.clientHeight / 2)
            .strength(0.1));
    }

    private applyBoundaryForce() {
        const boundaryForce = (params: { width: number, height: number, strength: number }) => {
            return (alpha: number) => {
                for (const node of this.simulation.nodes()) {
                    const {x, y, vx, vy} = node;
                    const r = node.relSize * this.config.circleRadiusUnit; // Use node's radius
                    const xminlim = r; // 0 + radius
                    const xmaxlim = params.width - r;
                    const yminlim = r; // 0 + radius
                    const ymaxlim = params.height - r;

                    if (x !== undefined && vx !== undefined && x <= xminlim) {
                        node.vx = vx + (xminlim - x) * params.strength * alpha;
                    } else if (x !== undefined && vx !== undefined && x >= xmaxlim) {
                        node.vx = vx + (xmaxlim - x) * params.strength * alpha;
                    }

                    if (y !== undefined && vy !== undefined && y <= yminlim) {
                        node.vy = vy + (yminlim - y) * params.strength * alpha;
                    } else if (y !== undefined && vy !== undefined && y >= ymaxlim) {
                        node.vy = vy + (ymaxlim - y) * params.strength * alpha;
                    }
                }
            };
        };
        this.simulation.force('boundary', boundaryForce(
            {width: this.container.clientWidth, height: this.container.clientHeight, strength: 0.3}));
    }

    private applyChargeForce() {
        this.simulation.force("charge", d3.forceManyBody().strength(this.config.chargeStrength));
    }

    private applyCollideForce() {
        this.simulation.force("collide", d3.forceCollide<Node>()
            .radius(d => d.relSize * this.config.circleRadiusUnit));
    }

    private applyAllForces() {
        this.applyCollideForce();
        this.applyChargeForce();
        this.applyCenterForce();
        this.applyBoundaryForce();
        // Re-apply link force with new distance
        this.simulation.force('link', d3.forceLink<Node, Link>(this.links).strength(0.07)
            .distance((link) => link.target.relDistance * this.config.linkDistanceUnit));
    }
}

