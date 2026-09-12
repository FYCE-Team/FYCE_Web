/*
 * FYCE exact seat-layout blueprint
 * Coordinate system matches the original source image: 1456 x 1034.
 *
 * IMPORTANT:
 * - Row A is intentionally absent.
 * - Row J is intentionally absent.
 * - Total active seats: 274.
 * - VIP classification remains an event-seat-config concern.
 */
export const FYCE_LAYOUT_NAME = "FYCE Main Concert Layout";
export const FYCE_VENUE_NAME = "FYCE Concert Hall";
export const FYCE_CANVAS = Object.freeze({
    width: 1456,
    height: 1034
});

export const FYCE_SECTIONS = [
    {
        "code": "CENTER",
        "name": "Khu vực trung tâm",
        "description": "Khu vực ghế trung tâm của khán phòng.",
        "rows": [
            {
                "row": "B",
                "seats": [
                    {
                        "number": 16,
                        "label": "B16",
                        "position": {
                            "x": 513.9,
                            "y": 479.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 14,
                        "label": "B14",
                        "position": {
                            "x": 542.1,
                            "y": 478.8
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 12,
                        "label": "B12",
                        "position": {
                            "x": 569.5,
                            "y": 479.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 10,
                        "label": "B10",
                        "position": {
                            "x": 597.6,
                            "y": 479.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 8,
                        "label": "B08",
                        "position": {
                            "x": 625.6,
                            "y": 479.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 6,
                        "label": "B06",
                        "position": {
                            "x": 653.6,
                            "y": 479.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 4,
                        "label": "B04",
                        "position": {
                            "x": 681.6,
                            "y": 479.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 2,
                        "label": "B02",
                        "position": {
                            "x": 709.6,
                            "y": 479.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 1,
                        "label": "B01",
                        "position": {
                            "x": 737.9,
                            "y": 479.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 3,
                        "label": "B03",
                        "position": {
                            "x": 765.6,
                            "y": 479.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 5,
                        "label": "B05",
                        "position": {
                            "x": 793.5,
                            "y": 479.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 7,
                        "label": "B07",
                        "position": {
                            "x": 821.8,
                            "y": 479.8
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 9,
                        "label": "B09",
                        "position": {
                            "x": 849.6,
                            "y": 480.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 11,
                        "label": "B11",
                        "position": {
                            "x": 877.9,
                            "y": 480.2
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 13,
                        "label": "B13",
                        "position": {
                            "x": 905.6,
                            "y": 479.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 15,
                        "label": "B15",
                        "position": {
                            "x": 934.1,
                            "y": 480.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "C",
                "seats": [
                    {
                        "number": 16,
                        "label": "C16",
                        "position": {
                            "x": 497.6,
                            "y": 516.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 14,
                        "label": "C14",
                        "position": {
                            "x": 527.3,
                            "y": 516.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 12,
                        "label": "C12",
                        "position": {
                            "x": 555.7,
                            "y": 516.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 10,
                        "label": "C10",
                        "position": {
                            "x": 583.6,
                            "y": 516.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 8,
                        "label": "C08",
                        "position": {
                            "x": 611.5,
                            "y": 516.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 6,
                        "label": "C06",
                        "position": {
                            "x": 639.7,
                            "y": 517.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 4,
                        "label": "C04",
                        "position": {
                            "x": 667.9,
                            "y": 517.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 2,
                        "label": "C02",
                        "position": {
                            "x": 695.8,
                            "y": 517.1
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 1,
                        "label": "C01",
                        "position": {
                            "x": 723.7,
                            "y": 517.1
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 3,
                        "label": "C03",
                        "position": {
                            "x": 751.5,
                            "y": 517.1
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 5,
                        "label": "C05",
                        "position": {
                            "x": 779.6,
                            "y": 517.1
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 7,
                        "label": "C07",
                        "position": {
                            "x": 807.9,
                            "y": 517.1
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 9,
                        "label": "C09",
                        "position": {
                            "x": 835.7,
                            "y": 516.8
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 11,
                        "label": "C11",
                        "position": {
                            "x": 863.5,
                            "y": 517.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 13,
                        "label": "C13",
                        "position": {
                            "x": 891.6,
                            "y": 517.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 15,
                        "label": "C15",
                        "position": {
                            "x": 919.5,
                            "y": 517.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 17,
                        "label": "C17",
                        "position": {
                            "x": 948.0,
                            "y": 517.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "D",
                "seats": [
                    {
                        "number": 18,
                        "label": "D18",
                        "position": {
                            "x": 469.5,
                            "y": 553.9
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 16,
                        "label": "D16",
                        "position": {
                            "x": 499.1,
                            "y": 554.2
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 14,
                        "label": "D14",
                        "position": {
                            "x": 527.5,
                            "y": 554.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 12,
                        "label": "D12",
                        "position": {
                            "x": 555.5,
                            "y": 554.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 10,
                        "label": "D10",
                        "position": {
                            "x": 583.5,
                            "y": 553.8
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 8,
                        "label": "D08",
                        "position": {
                            "x": 611.7,
                            "y": 554.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 6,
                        "label": "D06",
                        "position": {
                            "x": 639.6,
                            "y": 554.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 4,
                        "label": "D04",
                        "position": {
                            "x": 667.6,
                            "y": 554.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 2,
                        "label": "D02",
                        "position": {
                            "x": 695.5,
                            "y": 554.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 1,
                        "label": "D01",
                        "position": {
                            "x": 723.6,
                            "y": 554.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 3,
                        "label": "D03",
                        "position": {
                            "x": 751.4,
                            "y": 554.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 5,
                        "label": "D05",
                        "position": {
                            "x": 779.6,
                            "y": 554.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 7,
                        "label": "D07",
                        "position": {
                            "x": 807.6,
                            "y": 554.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 9,
                        "label": "D09",
                        "position": {
                            "x": 835.7,
                            "y": 554.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 11,
                        "label": "D11",
                        "position": {
                            "x": 863.4,
                            "y": 554.8
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 13,
                        "label": "D13",
                        "position": {
                            "x": 891.5,
                            "y": 554.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 15,
                        "label": "D15",
                        "position": {
                            "x": 919.9,
                            "y": 555.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 17,
                        "label": "D17",
                        "position": {
                            "x": 948.4,
                            "y": 555.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 19,
                        "label": "D19",
                        "position": {
                            "x": 977.8,
                            "y": 556.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "E",
                "seats": [
                    {
                        "number": 20,
                        "label": "E20",
                        "position": {
                            "x": 455.1,
                            "y": 589.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 18,
                        "label": "E18",
                        "position": {
                            "x": 484.6,
                            "y": 589.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 16,
                        "label": "E16",
                        "position": {
                            "x": 513.1,
                            "y": 589.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 14,
                        "label": "E14",
                        "position": {
                            "x": 541.1,
                            "y": 590.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 12,
                        "label": "E12",
                        "position": {
                            "x": 568.7,
                            "y": 590.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 10,
                        "label": "E10",
                        "position": {
                            "x": 596.8,
                            "y": 590.2
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 8,
                        "label": "E08",
                        "position": {
                            "x": 625.6,
                            "y": 589.9
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 6,
                        "label": "E06",
                        "position": {
                            "x": 652.8,
                            "y": 590.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 4,
                        "label": "E04",
                        "position": {
                            "x": 681.8,
                            "y": 590.9
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 2,
                        "label": "E02",
                        "position": {
                            "x": 709.1,
                            "y": 590.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 1,
                        "label": "E01",
                        "position": {
                            "x": 737.3,
                            "y": 590.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 3,
                        "label": "E03",
                        "position": {
                            "x": 764.7,
                            "y": 590.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 5,
                        "label": "E05",
                        "position": {
                            "x": 792.8,
                            "y": 590.8
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 7,
                        "label": "E07",
                        "position": {
                            "x": 820.9,
                            "y": 590.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 9,
                        "label": "E09",
                        "position": {
                            "x": 849.1,
                            "y": 590.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 11,
                        "label": "E11",
                        "position": {
                            "x": 877.0,
                            "y": 590.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 13,
                        "label": "E13",
                        "position": {
                            "x": 905.3,
                            "y": 590.8
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 15,
                        "label": "E15",
                        "position": {
                            "x": 933.8,
                            "y": 590.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 17,
                        "label": "E17",
                        "position": {
                            "x": 962.5,
                            "y": 590.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 19,
                        "label": "E19",
                        "position": {
                            "x": 991.4,
                            "y": 590.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "F",
                "seats": [
                    {
                        "number": 20,
                        "label": "F20",
                        "position": {
                            "x": 439.2,
                            "y": 625.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 18,
                        "label": "F18",
                        "position": {
                            "x": 468.8,
                            "y": 625.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 16,
                        "label": "F16",
                        "position": {
                            "x": 497.3,
                            "y": 625.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 14,
                        "label": "F14",
                        "position": {
                            "x": 525.1,
                            "y": 625.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 12,
                        "label": "F12",
                        "position": {
                            "x": 553.3,
                            "y": 625.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 10,
                        "label": "F10",
                        "position": {
                            "x": 581.1,
                            "y": 625.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 8,
                        "label": "F08",
                        "position": {
                            "x": 609.3,
                            "y": 626.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 6,
                        "label": "F06",
                        "position": {
                            "x": 637.3,
                            "y": 626.1
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 4,
                        "label": "F04",
                        "position": {
                            "x": 665.5,
                            "y": 626.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 2,
                        "label": "F02",
                        "position": {
                            "x": 693.1,
                            "y": 625.9
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 1,
                        "label": "F01",
                        "position": {
                            "x": 721.1,
                            "y": 626.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 3,
                        "label": "F03",
                        "position": {
                            "x": 748.6,
                            "y": 626.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 5,
                        "label": "F05",
                        "position": {
                            "x": 777.2,
                            "y": 626.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 7,
                        "label": "F07",
                        "position": {
                            "x": 805.3,
                            "y": 626.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 9,
                        "label": "F09",
                        "position": {
                            "x": 833.3,
                            "y": 626.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 11,
                        "label": "F11",
                        "position": {
                            "x": 861.6,
                            "y": 626.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 13,
                        "label": "F13",
                        "position": {
                            "x": 889.5,
                            "y": 626.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 15,
                        "label": "F15",
                        "position": {
                            "x": 917.6,
                            "y": 626.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 17,
                        "label": "F17",
                        "position": {
                            "x": 946.7,
                            "y": 626.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 19,
                        "label": "F19",
                        "position": {
                            "x": 975.4,
                            "y": 626.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 21,
                        "label": "F21",
                        "position": {
                            "x": 1003.6,
                            "y": 626.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "G",
                "seats": [
                    {
                        "number": 22,
                        "label": "G22",
                        "position": {
                            "x": 408.0,
                            "y": 661.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 20,
                        "label": "G20",
                        "position": {
                            "x": 437.1,
                            "y": 661.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 18,
                        "label": "G18",
                        "position": {
                            "x": 465.8,
                            "y": 661.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 16,
                        "label": "G16",
                        "position": {
                            "x": 494.2,
                            "y": 661.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 14,
                        "label": "G14",
                        "position": {
                            "x": 521.8,
                            "y": 661.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 12,
                        "label": "G12",
                        "position": {
                            "x": 549.9,
                            "y": 661.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 10,
                        "label": "G10",
                        "position": {
                            "x": 577.8,
                            "y": 661.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 8,
                        "label": "G08",
                        "position": {
                            "x": 605.7,
                            "y": 661.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 6,
                        "label": "G06",
                        "position": {
                            "x": 634.3,
                            "y": 661.8
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 4,
                        "label": "G04",
                        "position": {
                            "x": 662.4,
                            "y": 662.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 2,
                        "label": "G02",
                        "position": {
                            "x": 690.2,
                            "y": 662.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 1,
                        "label": "G01",
                        "position": {
                            "x": 718.4,
                            "y": 662.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 3,
                        "label": "G03",
                        "position": {
                            "x": 745.6,
                            "y": 662.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 5,
                        "label": "G05",
                        "position": {
                            "x": 773.9,
                            "y": 662.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 7,
                        "label": "G07",
                        "position": {
                            "x": 802.2,
                            "y": 662.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 9,
                        "label": "G09",
                        "position": {
                            "x": 829.9,
                            "y": 662.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 11,
                        "label": "G11",
                        "position": {
                            "x": 858.6,
                            "y": 662.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 13,
                        "label": "G13",
                        "position": {
                            "x": 886.6,
                            "y": 662.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 15,
                        "label": "G15",
                        "position": {
                            "x": 916.0,
                            "y": 662.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 17,
                        "label": "G17",
                        "position": {
                            "x": 944.4,
                            "y": 662.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 19,
                        "label": "G19",
                        "position": {
                            "x": 972.5,
                            "y": 662.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 21,
                        "label": "G21",
                        "position": {
                            "x": 1000.4,
                            "y": 662.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 23,
                        "label": "G23",
                        "position": {
                            "x": 1028.0,
                            "y": 662.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "H",
                "seats": [
                    {
                        "number": 8,
                        "label": "H08",
                        "position": {
                            "x": 610.5,
                            "y": 726.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 6,
                        "label": "H06",
                        "position": {
                            "x": 638.4,
                            "y": 727.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 4,
                        "label": "H04",
                        "position": {
                            "x": 666.4,
                            "y": 726.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 2,
                        "label": "H02",
                        "position": {
                            "x": 694.3,
                            "y": 727.1
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 1,
                        "label": "H01",
                        "position": {
                            "x": 722.4,
                            "y": 727.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 3,
                        "label": "H03",
                        "position": {
                            "x": 750.2,
                            "y": 727.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 5,
                        "label": "H05",
                        "position": {
                            "x": 778.4,
                            "y": 727.2
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 7,
                        "label": "H07",
                        "position": {
                            "x": 806.4,
                            "y": 727.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "I",
                "seats": [
                    {
                        "number": 8,
                        "label": "I08",
                        "position": {
                            "x": 597.2,
                            "y": 762.9
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 6,
                        "label": "I06",
                        "position": {
                            "x": 625.5,
                            "y": 763.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 4,
                        "label": "I04",
                        "position": {
                            "x": 653.4,
                            "y": 763.2
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 2,
                        "label": "I02",
                        "position": {
                            "x": 681.5,
                            "y": 763.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 1,
                        "label": "I01",
                        "position": {
                            "x": 709.3,
                            "y": 763.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 3,
                        "label": "I03",
                        "position": {
                            "x": 737.3,
                            "y": 763.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 5,
                        "label": "I05",
                        "position": {
                            "x": 765.1,
                            "y": 763.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 7,
                        "label": "I07",
                        "position": {
                            "x": 793.5,
                            "y": 763.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 9,
                        "label": "I09",
                        "position": {
                            "x": 820.6,
                            "y": 763.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "K",
                "seats": [
                    {
                        "number": 8,
                        "label": "K08",
                        "position": {
                            "x": 596.9,
                            "y": 798.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 6,
                        "label": "K06",
                        "position": {
                            "x": 625.2,
                            "y": 798.8
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 4,
                        "label": "K04",
                        "position": {
                            "x": 653.5,
                            "y": 798.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 2,
                        "label": "K02",
                        "position": {
                            "x": 681.4,
                            "y": 799.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 1,
                        "label": "K01",
                        "position": {
                            "x": 709.3,
                            "y": 799.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 3,
                        "label": "K03",
                        "position": {
                            "x": 737.1,
                            "y": 799.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 5,
                        "label": "K05",
                        "position": {
                            "x": 765.0,
                            "y": 799.2
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 7,
                        "label": "K07",
                        "position": {
                            "x": 793.4,
                            "y": 799.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 9,
                        "label": "K09",
                        "position": {
                            "x": 820.7,
                            "y": 799.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "L",
                "seats": [
                    {
                        "number": 10,
                        "label": "L10",
                        "position": {
                            "x": 581.1,
                            "y": 833.3
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 8,
                        "label": "L08",
                        "position": {
                            "x": 610.4,
                            "y": 833.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 6,
                        "label": "L06",
                        "position": {
                            "x": 638.2,
                            "y": 833.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 4,
                        "label": "L04",
                        "position": {
                            "x": 666.5,
                            "y": 833.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 2,
                        "label": "L02",
                        "position": {
                            "x": 694.3,
                            "y": 833.9
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 1,
                        "label": "L01",
                        "position": {
                            "x": 722.1,
                            "y": 833.8
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 3,
                        "label": "L03",
                        "position": {
                            "x": 750.3,
                            "y": 834.2
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 5,
                        "label": "L05",
                        "position": {
                            "x": 778.1,
                            "y": 834.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 7,
                        "label": "L07",
                        "position": {
                            "x": 806.3,
                            "y": 834.1
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 9,
                        "label": "L09",
                        "position": {
                            "x": 833.8,
                            "y": 834.0
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            }
        ]
    },
    {
        "code": "LEFT_LOWER",
        "name": "Cánh trái phía dưới",
        "description": "Khu vực ghế phía dưới bên trái.",
        "rows": [
            {
                "row": "H",
                "seats": [
                    {
                        "number": 18,
                        "label": "H18",
                        "position": {
                            "x": 378.5,
                            "y": 726.4
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 16,
                        "label": "H16",
                        "position": {
                            "x": 406.3,
                            "y": 726.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 14,
                        "label": "H14",
                        "position": {
                            "x": 449.2,
                            "y": 726.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 12,
                        "label": "H12",
                        "position": {
                            "x": 477.2,
                            "y": 726.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 10,
                        "label": "H10",
                        "position": {
                            "x": 505.0,
                            "y": 726.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "I",
                "seats": [
                    {
                        "number": 14,
                        "label": "I14",
                        "position": {
                            "x": 444.0,
                            "y": 762.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 12,
                        "label": "I12",
                        "position": {
                            "x": 471.5,
                            "y": 762.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 10,
                        "label": "I10",
                        "position": {
                            "x": 499.5,
                            "y": 762.8
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "K",
                "seats": [
                    {
                        "number": 12,
                        "label": "K12",
                        "position": {
                            "x": 455.7,
                            "y": 798.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 10,
                        "label": "K10",
                        "position": {
                            "x": 483.7,
                            "y": 798.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            }
        ]
    },
    {
        "code": "RIGHT_LOWER",
        "name": "Cánh phải phía dưới",
        "description": "Khu vực ghế phía dưới bên phải.",
        "rows": [
            {
                "row": "H",
                "seats": [
                    {
                        "number": 9,
                        "label": "H09",
                        "position": {
                            "x": 918.7,
                            "y": 727.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 11,
                        "label": "H11",
                        "position": {
                            "x": 946.7,
                            "y": 727.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 13,
                        "label": "H13",
                        "position": {
                            "x": 974.5,
                            "y": 727.9
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 15,
                        "label": "H15",
                        "position": {
                            "x": 1029.9,
                            "y": 727.9
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 17,
                        "label": "H17",
                        "position": {
                            "x": 1057.6,
                            "y": 728.2
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "I",
                "seats": [
                    {
                        "number": 11,
                        "label": "I11",
                        "position": {
                            "x": 924.4,
                            "y": 763.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 13,
                        "label": "I13",
                        "position": {
                            "x": 952.2,
                            "y": 763.6
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 15,
                        "label": "I15",
                        "position": {
                            "x": 979.9,
                            "y": 763.5
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "K",
                "seats": [
                    {
                        "number": 11,
                        "label": "K11",
                        "position": {
                            "x": 940.2,
                            "y": 799.9
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    },
                    {
                        "number": 13,
                        "label": "K13",
                        "position": {
                            "x": 967.6,
                            "y": 799.7
                        },
                        "width": 25,
                        "height": 30,
                        "rotation": 0,
                        "isActive": true
                    }
                ]
            }
        ]
    },
    {
        "code": "LEFT_WING",
        "name": "Cánh trái",
        "description": "Khu vực ghế bên trái khán phòng.",
        "rows": [
            {
                "row": "B",
                "seats": [
                    {
                        "number": 30,
                        "label": "B30",
                        "position": {
                            "x": 255.1,
                            "y": 370.2
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 28,
                        "label": "B28",
                        "position": {
                            "x": 278.4,
                            "y": 385.7
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 26,
                        "label": "B26",
                        "position": {
                            "x": 302.2,
                            "y": 401.5
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 24,
                        "label": "B24",
                        "position": {
                            "x": 325.7,
                            "y": 417.3
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 22,
                        "label": "B22",
                        "position": {
                            "x": 349.4,
                            "y": 433.5
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 20,
                        "label": "B20",
                        "position": {
                            "x": 372.8,
                            "y": 449.2
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 18,
                        "label": "B18",
                        "position": {
                            "x": 396.6,
                            "y": 465.0
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "C",
                "seats": [
                    {
                        "number": 32,
                        "label": "C32",
                        "position": {
                            "x": 210.5,
                            "y": 385.1
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 30,
                        "label": "C30",
                        "position": {
                            "x": 234.4,
                            "y": 401.2
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 28,
                        "label": "C28",
                        "position": {
                            "x": 257.5,
                            "y": 416.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 26,
                        "label": "C26",
                        "position": {
                            "x": 281.3,
                            "y": 432.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 24,
                        "label": "C24",
                        "position": {
                            "x": 305.0,
                            "y": 448.6
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 22,
                        "label": "C22",
                        "position": {
                            "x": 328.5,
                            "y": 464.4
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 20,
                        "label": "C20",
                        "position": {
                            "x": 352.3,
                            "y": 480.1
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 18,
                        "label": "C18",
                        "position": {
                            "x": 375.8,
                            "y": 495.9
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "D",
                "seats": [
                    {
                        "number": 34,
                        "label": "D34",
                        "position": {
                            "x": 189.6,
                            "y": 416.5
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 32,
                        "label": "D32",
                        "position": {
                            "x": 213.4,
                            "y": 432.4
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 30,
                        "label": "D30",
                        "position": {
                            "x": 236.8,
                            "y": 448.1
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 28,
                        "label": "D28",
                        "position": {
                            "x": 260.4,
                            "y": 463.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 26,
                        "label": "D26",
                        "position": {
                            "x": 284.0,
                            "y": 479.7
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 24,
                        "label": "D24",
                        "position": {
                            "x": 307.8,
                            "y": 495.5
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 22,
                        "label": "D22",
                        "position": {
                            "x": 331.4,
                            "y": 511.5
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 20,
                        "label": "D20",
                        "position": {
                            "x": 355.1,
                            "y": 527.3
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "E",
                "seats": [
                    {
                        "number": 38,
                        "label": "E38",
                        "position": {
                            "x": 146.2,
                            "y": 430.0
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 36,
                        "label": "E36",
                        "position": {
                            "x": 169.9,
                            "y": 446.0
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 34,
                        "label": "E34",
                        "position": {
                            "x": 193.7,
                            "y": 462.0
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 32,
                        "label": "E32",
                        "position": {
                            "x": 216.9,
                            "y": 477.6
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 30,
                        "label": "E30",
                        "position": {
                            "x": 240.6,
                            "y": 493.5
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 28,
                        "label": "E28",
                        "position": {
                            "x": 264.3,
                            "y": 509.4
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 26,
                        "label": "E26",
                        "position": {
                            "x": 288.1,
                            "y": 525.2
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 24,
                        "label": "E24",
                        "position": {
                            "x": 311.5,
                            "y": 540.9
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 22,
                        "label": "E22",
                        "position": {
                            "x": 335.0,
                            "y": 556.9
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "F",
                "seats": [
                    {
                        "number": 38,
                        "label": "F38",
                        "position": {
                            "x": 126.4,
                            "y": 460.0
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 36,
                        "label": "F36",
                        "position": {
                            "x": 150.0,
                            "y": 475.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 34,
                        "label": "F34",
                        "position": {
                            "x": 173.9,
                            "y": 491.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 32,
                        "label": "F32",
                        "position": {
                            "x": 197.0,
                            "y": 507.6
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 30,
                        "label": "F30",
                        "position": {
                            "x": 220.7,
                            "y": 523.3
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 28,
                        "label": "F28",
                        "position": {
                            "x": 244.3,
                            "y": 539.2
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 26,
                        "label": "F26",
                        "position": {
                            "x": 267.9,
                            "y": 555.2
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 24,
                        "label": "F24",
                        "position": {
                            "x": 291.6,
                            "y": 571.0
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 22,
                        "label": "F22",
                        "position": {
                            "x": 315.1,
                            "y": 586.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "G",
                "seats": [
                    {
                        "number": 42,
                        "label": "G42",
                        "position": {
                            "x": 82.7,
                            "y": 473.9
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 40,
                        "label": "G40",
                        "position": {
                            "x": 106.5,
                            "y": 489.6
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 38,
                        "label": "G38",
                        "position": {
                            "x": 130.2,
                            "y": 505.5
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 36,
                        "label": "G36",
                        "position": {
                            "x": 153.8,
                            "y": 521.7
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 34,
                        "label": "G34",
                        "position": {
                            "x": 177.2,
                            "y": 537.2
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 32,
                        "label": "G32",
                        "position": {
                            "x": 200.8,
                            "y": 553.2
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 30,
                        "label": "G30",
                        "position": {
                            "x": 224.3,
                            "y": 569.1
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 28,
                        "label": "G28",
                        "position": {
                            "x": 248.0,
                            "y": 584.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 26,
                        "label": "G26",
                        "position": {
                            "x": 271.5,
                            "y": 600.7
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    },
                    {
                        "number": 24,
                        "label": "G24",
                        "position": {
                            "x": 294.9,
                            "y": 616.5
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": 34,
                        "isActive": true
                    }
                ]
            }
        ]
    },
    {
        "code": "RIGHT_WING",
        "name": "Cánh phải",
        "description": "Khu vực ghế bên phải khán phòng.",
        "rows": [
            {
                "row": "B",
                "seats": [
                    {
                        "number": 17,
                        "label": "B17",
                        "position": {
                            "x": 1064.3,
                            "y": 464.1
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 19,
                        "label": "B19",
                        "position": {
                            "x": 1089.7,
                            "y": 450.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 21,
                        "label": "B21",
                        "position": {
                            "x": 1115.0,
                            "y": 437.9
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 23,
                        "label": "B23",
                        "position": {
                            "x": 1140.4,
                            "y": 424.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 25,
                        "label": "B25",
                        "position": {
                            "x": 1165.6,
                            "y": 411.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 27,
                        "label": "B27",
                        "position": {
                            "x": 1191.1,
                            "y": 398.9
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 29,
                        "label": "B29",
                        "position": {
                            "x": 1215.5,
                            "y": 386.0
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "C",
                "seats": [
                    {
                        "number": 19,
                        "label": "C19",
                        "position": {
                            "x": 1081.6,
                            "y": 497.2
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 21,
                        "label": "C21",
                        "position": {
                            "x": 1106.9,
                            "y": 484.2
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 23,
                        "label": "C23",
                        "position": {
                            "x": 1132.2,
                            "y": 471.1
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 25,
                        "label": "C25",
                        "position": {
                            "x": 1157.6,
                            "y": 458.0
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 27,
                        "label": "C27",
                        "position": {
                            "x": 1182.8,
                            "y": 444.9
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 29,
                        "label": "C29",
                        "position": {
                            "x": 1208.0,
                            "y": 431.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 31,
                        "label": "C31",
                        "position": {
                            "x": 1232.9,
                            "y": 419.1
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 33,
                        "label": "C33",
                        "position": {
                            "x": 1258.5,
                            "y": 405.9
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "D",
                "seats": [
                    {
                        "number": 21,
                        "label": "D21",
                        "position": {
                            "x": 1098.8,
                            "y": 530.6
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 23,
                        "label": "D23",
                        "position": {
                            "x": 1124.2,
                            "y": 517.6
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 25,
                        "label": "D25",
                        "position": {
                            "x": 1149.5,
                            "y": 504.6
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 27,
                        "label": "D27",
                        "position": {
                            "x": 1174.7,
                            "y": 491.4
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 29,
                        "label": "D29",
                        "position": {
                            "x": 1199.9,
                            "y": 478.4
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 31,
                        "label": "D31",
                        "position": {
                            "x": 1225.4,
                            "y": 465.3
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 33,
                        "label": "D33",
                        "position": {
                            "x": 1250.3,
                            "y": 452.5
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 35,
                        "label": "D35",
                        "position": {
                            "x": 1275.8,
                            "y": 439.4
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "E",
                "seats": [
                    {
                        "number": 21,
                        "label": "E21",
                        "position": {
                            "x": 1115.2,
                            "y": 562.2
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 23,
                        "label": "E23",
                        "position": {
                            "x": 1140.6,
                            "y": 549.2
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 25,
                        "label": "E25",
                        "position": {
                            "x": 1165.9,
                            "y": 536.1
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 27,
                        "label": "E27",
                        "position": {
                            "x": 1191.3,
                            "y": 523.1
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 29,
                        "label": "E29",
                        "position": {
                            "x": 1216.3,
                            "y": 509.9
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 31,
                        "label": "E31",
                        "position": {
                            "x": 1241.9,
                            "y": 496.9
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 33,
                        "label": "E33",
                        "position": {
                            "x": 1266.6,
                            "y": 484.1
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 35,
                        "label": "E35",
                        "position": {
                            "x": 1292.4,
                            "y": 471.0
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 37,
                        "label": "E37",
                        "position": {
                            "x": 1317.5,
                            "y": 457.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "F",
                "seats": [
                    {
                        "number": 23,
                        "label": "F23",
                        "position": {
                            "x": 1131.8,
                            "y": 594.3
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 25,
                        "label": "F25",
                        "position": {
                            "x": 1157.2,
                            "y": 581.3
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 27,
                        "label": "F27",
                        "position": {
                            "x": 1182.6,
                            "y": 568.3
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 29,
                        "label": "F29",
                        "position": {
                            "x": 1207.6,
                            "y": 555.0
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 31,
                        "label": "F31",
                        "position": {
                            "x": 1233.0,
                            "y": 542.0
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 33,
                        "label": "F33",
                        "position": {
                            "x": 1258.4,
                            "y": 528.9
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 35,
                        "label": "F35",
                        "position": {
                            "x": 1283.2,
                            "y": 516.1
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 37,
                        "label": "F37",
                        "position": {
                            "x": 1308.9,
                            "y": 502.9
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 39,
                        "label": "F39",
                        "position": {
                            "x": 1334.2,
                            "y": 489.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    }
                ]
            },
            {
                "row": "G",
                "seats": [
                    {
                        "number": 25,
                        "label": "G25",
                        "position": {
                            "x": 1148.2,
                            "y": 625.9
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 27,
                        "label": "G27",
                        "position": {
                            "x": 1173.6,
                            "y": 612.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 29,
                        "label": "G29",
                        "position": {
                            "x": 1198.8,
                            "y": 600.1
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 31,
                        "label": "G31",
                        "position": {
                            "x": 1224.1,
                            "y": 587.0
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 33,
                        "label": "G33",
                        "position": {
                            "x": 1249.5,
                            "y": 573.8
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 35,
                        "label": "G35",
                        "position": {
                            "x": 1274.9,
                            "y": 560.7
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 37,
                        "label": "G37",
                        "position": {
                            "x": 1299.8,
                            "y": 547.7
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 39,
                        "label": "G39",
                        "position": {
                            "x": 1325.3,
                            "y": 534.5
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 41,
                        "label": "G41",
                        "position": {
                            "x": 1350.5,
                            "y": 521.6
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    },
                    {
                        "number": 43,
                        "label": "G43",
                        "position": {
                            "x": 1375.6,
                            "y": 508.3
                        },
                        "width": 26,
                        "height": 22,
                        "rotation": -27,
                        "isActive": true
                    }
                ]
            }
        ]
    }
];

export const flattenFyceLayoutSeats = () =>
    FYCE_SECTIONS.flatMap((section) =>
        section.rows.flatMap((row) =>
            row.seats.map((seat) => ({
                section: section.code,
                row: row.row,
                ...seat
            }))
        )
    );

export const validateFyceBlueprint = () => {
    const seats = flattenFyceLayoutSeats();

    if (seats.length !== 274) {
        throw new Error(
            `FYCE_BLUEPRINT_COUNT_INVALID: expected=274 actual=${seats.length}`
        );
    }

    const keys = new Set();

    for (const seat of seats) {
        if (seat.row === "A" || seat.row === "J") {
            throw new Error(
                `FYCE_BLUEPRINT_INVALID_ROW:${seat.row}`
            );
        }

        const key =
            `${seat.section}:${seat.row}:${seat.number}`;

        if (keys.has(key)) {
            throw new Error(
                `FYCE_BLUEPRINT_DUPLICATE:${key}`
            );
        }

        keys.add(key);
    }

    return seats;
};
