import {
    useEffect,
    useMemo,
    useState
} from "react";
import "./SeatMap.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000/api";

const EMPTY_SELECTED_SEAT_IDS = [];
const CANVAS_WIDTH = 1456;
const CANVAS_HEIGHT = 1034;

const VIP_ROWS = new Set([
    "B",
    "C",
    "D",
    "E",
    "F",
    "G"
]);

const CENTER_ROWS = [
    "B",
    "C",
    "D",
    "E",
    "F",
    "G"
];

const LOWER_ROWS = [
    "H",
    "I",
    "K",
    "L"
];

const normalizeRow = (value) =>
    String(value || "")
        .trim()
        .toUpperCase();

const normalizeSection = (value) =>
    String(value || "")
        .trim()
        .toLowerCase();

const getTicketCategory = (
    seat,
    ticketCategories
) =>
    Array.isArray(ticketCategories)
        ? ticketCategories.find(
              (category) =>
                  String(category._id) ===
                  String(
                      seat.ticketCategoryId
                  )
          ) || null
        : null;

const getVisualCategory = (
    seat,
    ticketCategories
) => {
    const category =
        getTicketCategory(
            seat,
            ticketCategories
        );

    const code = String(
        category?.code || ""
    )
        .trim()
        .toUpperCase();

    if (code === "VIP") {
        return "VIP";
    }

    if (
        code === "STANDARD" ||
        code === "STD"
    ) {
        return "STANDARD";
    }

    return (
        normalizeSection(
            seat.section
        ) === "center" &&
        VIP_ROWS.has(
            normalizeRow(seat.row)
        )
    )
        ? "VIP"
        : "STANDARD";
};

const formatPrice = (value) =>
    new Intl.NumberFormat("vi-VN").format(
        Number(value) || 0
    );

const getPrice = (
    seat,
    ticketCategories
) =>
    Number(
        getTicketCategory(
            seat,
            ticketCategories
        )?.price
    ) || 0;

const isSelectable = (seat) =>
    seat?.isActive !== false &&
    seat?.status === "available";

const fetchSeats = async (eventId) => {
    const response = await fetch(
        `${API_BASE_URL}/events/${eventId}/seats`
    );

    const result = await response.json();

    if (!response.ok || !result?.success) {
        throw new Error(
            result?.message ||
                "Không thể lấy sơ đồ ghế."
        );
    }

    return result?.data?.seats || [];
};

const bySectionAndRow = (
    seats,
    section,
    row
) =>
    seats.filter(
        (seat) =>
            normalizeSection(
                seat.section
            ) === section &&
            normalizeRow(seat.row) ===
                row
    );

const getBounds = (rowSeats) => {
    if (!rowSeats.length) {
        return null;
    }

    const xs = rowSeats.map(
        (seat) =>
            Number(
                seat?.position?.x
            )
    );

    const ys = rowSeats.map(
        (seat) =>
            Number(
                seat?.position?.y
            )
    );

    return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
        avgY:
            ys.reduce(
                (sum, value) =>
                    sum + value,
                0
            ) / ys.length
    };
};

const buildDynamicLabels = (
    seats
) => {
    const labels = [];

    for (const row of CENTER_ROWS) {
        const center =
            getBounds(
                bySectionAndRow(
                    seats,
                    "center",
                    row
                )
            );

        if (center) {
            labels.push({
                key:
                    `center-${row}-left`,
                row,
                x:
                    center.minX - 27,
                y: center.avgY,
                rotation: 0,
                type: "center"
            });

            labels.push({
                key:
                    `center-${row}-right`,
                row,
                x:
                    center.maxX + 27,
                y: center.avgY,
                rotation: 0,
                type: "center"
            });
        }

        const leftWing =
            getBounds(
                bySectionAndRow(
                    seats,
                    "left_wing",
                    row
                )
            );

        if (leftWing) {
            labels.push({
                key:
                    `left-wing-${row}`,
                row,
                x:
                    leftWing.maxX + 22,
                y:
                    leftWing.maxY + 8,
                rotation: 34,
                type: "wing"
            });
        }

        const rightWing =
            getBounds(
                bySectionAndRow(
                    seats,
                    "right_wing",
                    row
                )
            );

        if (rightWing) {
            labels.push({
                key:
                    `right-wing-${row}`,
                row,
                x:
                    rightWing.minX - 22,
                y:
                    rightWing.maxY + 8,
                rotation: -27,
                type: "wing"
            });
        }
    }

    const allLeftLowerSeats =
        seats.filter(
            (seat) =>
                normalizeSection(
                    seat.section
                ) === "left_lower"
        );

    const allCenterLowerSeats =
        seats.filter(
            (seat) =>
                normalizeSection(
                    seat.section
                ) === "center" &&
                LOWER_ROWS.includes(
                    normalizeRow(
                        seat.row
                    )
                )
        );

    const allRightLowerSeats =
        seats.filter(
            (seat) =>
                normalizeSection(
                    seat.section
                ) === "right_lower"
        );

    const leftLowerBounds =
        getBounds(allLeftLowerSeats);
    const centerLowerBounds =
        getBounds(allCenterLowerSeats);
    const rightLowerBounds =
        getBounds(allRightLowerSeats);

    const sharedLowerLeftX =
        leftLowerBounds &&
        centerLowerBounds
            ? (
                  leftLowerBounds.maxX +
                  centerLowerBounds.minX
              ) / 2
            : centerLowerBounds
            ? centerLowerBounds.minX - 34
            : 0;

    const sharedLowerRightX =
        rightLowerBounds &&
        centerLowerBounds
            ? (
                  centerLowerBounds.maxX +
                  rightLowerBounds.minX
              ) / 2
            : centerLowerBounds
            ? centerLowerBounds.maxX + 34
            : 0;

    for (const row of LOWER_ROWS) {
        const center =
            getBounds(
                bySectionAndRow(
                    seats,
                    "center",
                    row
                )
            );

        if (!center) {
            continue;
        }

        labels.push({
            key:
                `lower-${row}-left`,
            row,
            x: sharedLowerLeftX,
            y: center.avgY,
            rotation: 0,
            type: "lower"
        });

        labels.push({
            key:
                `lower-${row}-right`,
            row,
            x: sharedLowerRightX,
            y: center.avgY,
            rotation: 0,
            type: "lower"
        });
    }

    return labels;
};

const SeatIcon = ({
    seat,
    ticketCategories,
    selected,
    busy,
    onSelect
}) => {
    const x = Number(
        seat?.position?.x
    );
    const y = Number(
        seat?.position?.y
    );

    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y)
    ) {
        return null;
    }

    const width =
        Number(seat.width) || 25;
    const height =
        Number(seat.height) || 30;
    const rotation =
        Number(seat.rotation) || 0;

    const visualCategory =
        getVisualCategory(
            seat,
            ticketCategories
        );

    const selectable =
        !busy &&
        (
            selected ||
            isSelectable(seat)
        );

    const classes = [
        "svg-seat",
        visualCategory === "VIP"
            ? "svg-seat--vip"
            : "svg-seat--standard"
    ];

    if (selected) {
        classes.push(
            "svg-seat--selected"
        );
    }

    if (busy) {
        classes.push(
            "svg-seat--busy"
        );
    }

    if (seat.status === "sold") {
        classes.push(
            "svg-seat--sold"
        );
    }

    if (seat.status === "held") {
        classes.push(
            "svg-seat--held"
        );
    }

    if (
        seat.status === "blocked"
    ) {
        classes.push(
            "svg-seat--blocked"
        );
    }

    const activate = () => {
        if (selectable) {
            onSelect(seat);
        }
    };

    const price = formatPrice(
        getPrice(
            seat,
            ticketCategories
        )
    );

    return (
        <g
            className={
                classes.join(" ")
            }
            transform={`translate(${x} ${y}) rotate(${rotation})`}
            role="button"
            tabIndex={
                selectable ? 0 : -1
            }
            aria-disabled={!selectable}
            aria-busy={busy}
            aria-pressed={selected}
            aria-label={`Ghế ${seat.label}, ${visualCategory}, ${price} VND`}
            onClick={activate}
            onKeyDown={(event) => {
                if (
                    event.key ===
                        "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    activate();
                }
            }}
        >
            <title>
                {`${seat.label} · ${visualCategory} · ${price} VND`}
            </title>

            {/* Backrest */}
            <rect
                className="svg-seat__back"
                x={-width * 0.31}
                y={-height * 0.44}
                width={width * 0.62}
                height={height * 0.43}
                rx="3.5"
                ry="3.5"
            />

            {/* Seat cushion */}
            <rect
                className="svg-seat__base"
                x={-width * 0.36}
                y={-height * 0.03}
                width={width * 0.72}
                height={height * 0.18}
                rx="2.5"
                ry="2.5"
            />

            {/* Left armrest */}
            <path
                className="svg-seat__arm"
                d={`
                    M ${-width * 0.43} ${-height * 0.11}
                    Q ${-width * 0.49} ${-height * 0.11}
                      ${-width * 0.49} ${-height * 0.04}
                    V ${height * 0.24}
                    H ${-width * 0.38}
                    V ${-height * 0.04}
                    Q ${-width * 0.38} ${-height * 0.11}
                      ${-width * 0.43} ${-height * 0.11}
                    Z
                `}
            />

            {/* Right armrest */}
            <path
                className="svg-seat__arm"
                d={`
                    M ${width * 0.43} ${-height * 0.11}
                    Q ${width * 0.49} ${-height * 0.11}
                      ${width * 0.49} ${-height * 0.04}
                    V ${height * 0.24}
                    H ${width * 0.38}
                    V ${-height * 0.04}
                    Q ${width * 0.38} ${-height * 0.11}
                      ${width * 0.43} ${-height * 0.11}
                    Z
                `}
            />

            <text
                className="svg-seat__number"
                x="0"
                y={-height * 0.235}
                textAnchor="middle"
                dominantBaseline="middle"
            >
                {seat.number}
            </text>
        </g>
    );
};

const SeatMap = ({
    eventId,
    ticketCategories = [],
    selectedSeatIds = EMPTY_SELECTED_SEAT_IDS,
    onSelectionChange,
    onSeatToggle,
    busySeatIds = EMPTY_SELECTED_SEAT_IDS,
    refreshKey = 0,
    className = "",
    showLegend = true,
    showFooter = true
}) => {
    const [seats, setSeats] =
        useState([]);
    const [loading, setLoading] =
        useState(true);
    const [error, setError] =
        useState("");

    const [
        internalSelectedIds,
        setInternalSelectedIds
    ] = useState(
        () =>
            new Set(
                selectedSeatIds.map(
                    (id) => String(id)
                )
            )
    );

    useEffect(() => {
        const next = new Set(
            (
                Array.isArray(
                    selectedSeatIds
                )
                    ? selectedSeatIds
                    : []
            ).map((id) => String(id))
        );

        setInternalSelectedIds(
            next
        );
    }, [selectedSeatIds]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!eventId) {
                setSeats([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const result =
                    await fetchSeats(
                        eventId
                    );

                if (!cancelled) {
                    setSeats(result);
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(
                        requestError.message ||
                            "Không thể tải sơ đồ ghế."
                    );
                    setSeats([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [
        eventId,
        refreshKey
    ]);

    const visibleSeats = useMemo(
        () =>
            seats.filter(
                (seat) =>
                    normalizeRow(
                        seat.row
                    ) !== "A"
            ),
        [seats]
    );

    const rowLabels = useMemo(
        () =>
            buildDynamicLabels(
                visibleSeats
            ),
        [visibleSeats]
    );

    const selectedSeats = useMemo(
        () =>
            visibleSeats.filter(
                (seat) =>
                    internalSelectedIds.has(
                        String(seat._id)
                    )
            ),
        [
            visibleSeats,
            internalSelectedIds
        ]
    );

    const totalPrice = useMemo(
        () =>
            selectedSeats.reduce(
                (total, seat) =>
                    total +
                    getPrice(
                        seat,
                        ticketCategories
                    ),
                0
            ),
        [
            selectedSeats,
            ticketCategories
        ]
    );

    const busyIds = useMemo(
        () =>
            new Set(
                (
                    Array.isArray(
                        busySeatIds
                    )
                        ? busySeatIds
                        : []
                ).map(
                    (id) =>
                        String(id)
                )
            ),
        [busySeatIds]
    );

    const handleSeatSelect = (
        seat
    ) => {
        const id =
            String(seat._id);

        const selected =
            internalSelectedIds.has(
                id
            );

        if (
            busyIds.has(id) ||
            (
                !selected &&
                !isSelectable(seat)
            )
        ) {
            return;
        }

        if (onSeatToggle) {
            Promise.resolve(
                onSeatToggle(
                    seat,
                    selected
                )
            ).catch(
                (error) => {
                    console.error(
                        "Seat toggle error:",
                        error
                    );
                }
            );

            return;
        }

        setInternalSelectedIds(
            (current) => {
                const next =
                    new Set(current);

                if (next.has(id)) {
                    next.delete(id);
                } else {
                    next.add(id);
                }

                return next;
            }
        );
    };

    useEffect(() => {
        if (!onSelectionChange) {
            return;
        }

        onSelectionChange(
            visibleSeats.filter(
                (seat) =>
                    internalSelectedIds.has(
                        String(seat._id)
                    )
            )
        );
    }, [
        visibleSeats,
        internalSelectedIds,
        onSelectionChange
    ]);

    if (loading) {
        return (
            <div
                className={`seatmap-ui seatmap-ui--state ${className}`}
            >
                Đang tải sơ đồ ghế...
            </div>
        );
    }

    if (error) {
        return (
            <div
                className={`seatmap-ui seatmap-ui--state ${className}`}
            >
                {error}
            </div>
        );
    }

    return (
        <section
            className={`seatmap-ui ${className}`}
        >
            {showLegend && (
                <div className="seatmap-ui__legend">
                    <span>
                        <i className="legend-swatch legend-swatch--standard" />
                        Còn trống
                    </span>
                    <span>
                        <i className="legend-swatch legend-swatch--selected" />
                        Đang chọn
                    </span>
                    <span>
                        <i className="legend-swatch legend-swatch--sold" />
                        Đã bán
                    </span>
                    <span>
                        <i className="legend-swatch legend-swatch--held" />
                        Đang giữ
                    </span>
                </div>
            )}

            <div className="seatmap-ui__viewport">
                <svg
                    className="seatmap-ui__svg"
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    aria-label="Sơ đồ ghế FYCE"
                >
                    <rect
                        className="hall-outline"
                        x="30"
                        y="28"
                        width="1390"
                        height="978"
                    />

                    <path
                        className="stage"
                        d="
                            M 31 29
                            H 1420
                            V 294
                            H 1084
                            C 1004 360 870 389 728 389
                            C 586 389 452 360 372 294
                            H 31
                            Z
                        "
                    />

                    <text
                        className="stage-title"
                        x="728"
                        y="242"
                        textAnchor="middle"
                    >
                        SÂN KHẤU
                    </text>

                    <polygon
                        className="rest-area"
                        points="72,694 106,596 290,692 318,714 318,834 72,834"
                    />

                    <text
                        className="rest-title"
                        x="195"
                        y="725"
                        textAnchor="middle"
                    >
                        <tspan
                            x="195"
                            dy="0"
                        >
                            KHU VỰC GIẢI LAO
                        </tspan>
                        <tspan
                            x="195"
                            dy="19"
                        >
                            NHÀ VỆ SINH
                        </tspan>
                    </text>

                    <polygon
                        className="rest-area"
                        points="1138,714 1166,692 1350,596 1384,694 1384,834 1138,834"
                    />

                    <text
                        className="rest-title"
                        x="1261"
                        y="725"
                        textAnchor="middle"
                    >
                        <tspan
                            x="1261"
                            dy="0"
                        >
                            KHU VỰC GIẢI LAO
                        </tspan>
                        <tspan
                            x="1261"
                            dy="19"
                        >
                            NHÀ VỆ SINH
                        </tspan>
                    </text>

                    <rect
                        className="technical-room"
                        x="356"
                        y="865"
                        width="715"
                        height="102"
                    />

                    <text
                        className="technical-title"
                        x="713.5"
                        y="928"
                        textAnchor="middle"
                    >
                        PHÒNG KỸ THUẬT
                    </text>

                    {[
                        [430, 695],
                        [560, 695],
                        [865, 695],
                        [1003, 695]
                    ].map(([x, y]) => (
                        <circle
                            key={`${x}-${y}`}
                            className="aisle-dot"
                            cx={x}
                            cy={y}
                            r="8"
                        />
                    ))}

                    {rowLabels.map(
                        (label) => (
                            <text
                                key={
                                    label.key
                                }
                                className={`row-label row-label--${label.type}`}
                                x={label.x}
                                y={label.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                transform={
                                    label.rotation
                                        ? `rotate(${label.rotation} ${label.x} ${label.y})`
                                        : undefined
                                }
                            >
                                {label.row}
                            </text>
                        )
                    )}

                    {visibleSeats.map(
                        (seat) => (
                            <SeatIcon
                                key={
                                    seat._id
                                }
                                seat={seat}
                                ticketCategories={
                                    ticketCategories
                                }
                                selected={internalSelectedIds.has(
                                    String(
                                        seat._id
                                    )
                                )}
                                busy={busyIds.has(
                                    String(
                                        seat._id
                                    )
                                )}
                                onSelect={
                                    handleSeatSelect
                                }
                            />
                        )
                    )}
                </svg>
            </div>

            {showFooter && (
                <div className="seatmap-ui__footer">
                    <span className="seatmap-ui__selection">
                        {selectedSeats.length ===
                        0
                            ? "Chưa chọn ghế"
                            : selectedSeats
                                  .map(
                                      (seat) =>
                                          seat.label
                                  )
                                  .join(", ")}
                    </span>

                    <strong>
                        {formatPrice(
                            totalPrice
                        )}{" "}
                        VND
                    </strong>
                </div>
            )}
        </section>
    );
};

export default SeatMap;