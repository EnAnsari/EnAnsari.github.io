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
    // CHANGED: Config is now mutable and will be updated on resize
    private config: { linkDistanceUnit: number, chargeStrength: number, circleRadiusUnit: number };
    private readonly simulation;
    private hideTask: () => void;
    // ADDED: A single tooltip for the whole application
    private readonly tip: Tooltip;
    // ADDED: A container for all nodes/links, used for zooming
    private readonly container: SVGGElement;

    public constructor(
        // CHANGED: Accept the main SVG element
        private readonly svg: SVGSVGElement,
    ) {
        // ADDED: Create the 'g' element that will hold the visualization and respond to zoom
        this.container = d3.select(this.svg).append('g').node() as SVGGElement;

        // ADDED: Create the single tooltip instance
        this.tip = new Tooltip();
        document.body.appendChild(this.tip.getNode());

        // This will be populated by updateConfig
        this.config = { linkDistanceUnit: 0, chargeStrength: 0, circleRadiusUnit: 0 };
        this.updateConfig(); // Set initial config

        this.simulation = d3.forceSimulation<Node, Link>(this.nodes)
            .on('tick', () => this.ticked());
        this.applyAllForces();

        this.simulation.velocityDecay(0.05);
        this.hideTask = () => {};

        // ADDED: Zoom and Pan functionality
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4]) // Min 0.1x zoom, max 4x zoom
            .on('zoom', (event) => {
                d3.select(this.container).attr('transform', event.transform.toString());
                // Hide tooltip on zoom/pan to prevent it from getting stuck
                this.tip.hide();
            });

        d3.select(this.svg)
            .call(zoom)
            // ADDED: Background click to hide tooltip
            .on('click', () => {
                this.tip.hide();
            });

        this.registerResize();
    }

    // ADDED: A function to calculate and set sizing config
    // This will be called on init and on resize
    private updateConfig() {
        const sizeFactor = Math.min(this.svg.clientWidth, this.svg.clientHeight) / 1000;
        this.config = {
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
        d3.select(this.container) // CHANGED: Select from the 'g' container
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
                    
                    nodeEnter.each(d =>
                        d3.select(this.svg) // CHANGED: Add defs to main svg
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

                    // REMOVED: Per-node tooltip creation

                    // CHANGED: Use the single, class-wide tooltip
                    // FIXED: Changed NodeJS.Timeout to ReturnType<typeof setTimeout> for browser compatibility
                    let showTimeout: ReturnType<typeof setTimeout>;
                    
                    this.tip.getNode().onmouseover = (() => {
                        clearTimeout(showTimeout);
                    });
                    this.tip.getNode().onmouseout = (() => {
                        showTimeout = setTimeout(this.hideTask, 800);
                    });

                    nodeEnter.filter((d: Node) => {
                        return d.description !== undefined && d.description.length > 0;
                    })
                    // --- Desktop Hover ---
                    .on('mouseover', (event, d) => {
                        clearTimeout(showTimeout);
                        this.tip.setData(event, d, this.config.circleRadiusUnit);
                        this.hideTask(); // Hide any other visible tip
                        this.tip.show();
                    }).on('mouseout', (event, d) => {
                        this.hideTask = () => this.tip.hide();
                        showTimeout = setTimeout(this.hideTask, 800);
                    })
                    // --- ADDED: Mobile Tap/Click ---
                    .on('click', (event, d) => {
                        // Stop the click from bubbling up to the SVG (which would hide the tip)
                        event.stopPropagation(); 
                        clearTimeout(showTimeout);
                        this.tip.setData(event, d, this.config.circleRadiusUnit);
                        this.hideTask(); // Hide any other visible tip
                        this.tip.show();
                    });

                    return nodeEnter;
                },
                undefined,
                exit => exit.remove());

        d3.select(this.container) // CHANGED: Select from the 'g' container
            .selectAll<SVGLineElement, Link>('.link')
            .data(this.links, (d) => `${d.source.id}-${d.target.id}`)
            .join(
                enter => enter
                    .append('line')
                    .attr('class', 'link'),
                update => update,
                exit => exit.remove());

        // Update the simulation
        this.simulation.nodes(this.nodes);
        this.simulation.force('link', d3.forceLink<Node, Link>(this.links).strength(0.07)
            .distance((link) => link.target.relDistance * this.config.linkDistanceUnit));
        this.simulation.alpha(0.3).restart();

        // re-order line and nodes
        d3.select(this.container).selectAll<SVGLineElement, Link>('.link') // CHANGED: Select from the 'g' container
            .each(function (link) {
                const linkElement = this;
                linkElement.parentNode?.insertBefore(linkElement, linkElement.parentNode.firstChild);
            });
    }

    private selectLinks() {
        return d3.select(this.container).selectAll<SVGLineElement, Link>('.link').data(this.links); // CHANGED: Select from the 'g' container
    }

    private selectNodes() {
        return d3.select(this.container).selectAll<SVGGElement, Node>('.node').data(this.nodes); // CHANGED: Select from the 'g' container
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
        this.selectLinks()
            .attr('x1', (d) => d.source?.x ?? assert.fail())
            .attr('y1', (d) => d.source?.y ?? assert.fail())
            .attr('x2', (d) => d.target?.x ?? assert.fail())
            .attr('y2', (d) => d.target?.y ?? assert.fail());
        this.selectNodes()
            // CHANGED: Use transform for node position
            .attr('transform', (d) => `translate(${d.x}, ${d.y})`);
    }

    private registerResize() {
        // FIXED: Changed NodeJS.Timeout to ReturnType<typeof setTimeout>
        let lastResizeTimeout: ReturnType<typeof setTimeout> | undefined;

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (lastResizeTimeout !== undefined) {
                    clearTimeout(lastResizeTimeout);
                }
                // Set a new timeout to execute the resize logic after 1 second of inactivity
                lastResizeTimeout = setTimeout(() => {
                    // --- ADDED: Responsive Logic ---
                    // 1. Recalculate size config
                    this.updateConfig();
                    
                    // 2. Update forces that depend on config
                    this.applyAllForces(); // Re-applies all forces with new config
                    this.simulation.force('link', d3.forceLink<Node, Link>(this.links).strength(0.07)
                        .distance((link) => link.target.relDistance * this.config.linkDistanceUnit));
                    
                    // 3. Update existing node elements with new radius
                    this.selectNodes().selectAll('circle')
                         .attr('r', (d: any) => d.relSize * this.config.circleRadiusUnit);
                    
                    // 4. Update image patterns
                    this.selectNodes().each((d: any) => {
                         d3.select(this.svg).select('#pattern' + d.id)
                            .attr('x', -d.relSize * this.config.circleRadiusUnit)
                            .attr('y', -d.relSize * this.config.circleRadiusUnit)
                            .attr('width', d.relSize * this.config.circleRadiusUnit * 2)
                            .attr('height', d.relSize * this.config.circleRadiusUnit * 2)
                            .select("image")
                            .attr('width', d.relSize * this.config.circleRadiusUnit * 2)
                            .attr('height', d.relSize * this.config.circleRadiusUnit * 2);
                    });
                    // --- End of Responsive Logic ---

                    this.simulation.alpha(1).restart();
                    lastResizeTimeout = undefined;
                }, 500);
            }
        });
        resizeObserver.observe(this.svg); // CHANGED: Observe the main SVG element
    }

    private applyCenterForce() {
        // CHANGED: Use svg clientWidth/Height
        this.simulation.force('center', d3.forceCenter(this.svg.clientWidth / 2, this.svg.clientHeight / 2)
            .strength(0.1));
    }

    private applyBoundaryForce() {
        const boundaryForce = (params: { width: number, height: number, strength: number }) => {
            return (alpha: number) => {
                for (const node of this.simulation.nodes()) {
                    const {x, y, vx, vy} = node;
                    const xminlim = 0.1 * params.width;
                    const xmaxlim = 0.9 * params.width;
                    const yminlim = 0.1 * params.height;
                    const ymaxlim = 0.9 * params.height;
                    if (x !== undefined && vx !== undefined && x <= xminlim) {
                        node.vx = vx + (xminlim - x) * params.strength * alpha;
                    } else if (x !== undefined && vx !== undefined && x >= 0.9 * params.width) {
                        node.vx = vx + (xmaxlim - x) * params.strength * alpha;
                    }

                    if (y !== undefined && vy !== undefined && y <= 0.1 * params.height) {
                        node.vy = vy + (yminlim - y) * params.strength * alpha;
                    } else if (y !== undefined && vy !== undefined && y >= 0.9 * params.height) {
                        node.vy = vy + (ymaxlim - y) * params.strength * alpha;
                    }
                }
            };
        };
        this.simulation.force('boundary', boundaryForce(
            // CHANGED: Use svg clientWidth/Height
            {width: this.svg.clientWidth, height: this.svg.clientHeight, strength: 0.3}));
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
    }
}

