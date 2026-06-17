(function () {
  window.HOBBIT_MAP_LAYOUT = {
  "version": 2,
  "world": {
    "nodes": {
      "region:bilbo_home": {
        "x": -0.5,
        "y": 0
      },
      "room:lane_beneath_hill": {
        "x": 1.5,
        "y": 0
      },
      "room:party_field": {
        "x": 2.4285714285714284,
        "y": 0
      },
      "room:bywater_bridge": {
        "x": 3.5,
        "y": 0
      },
      "room:green_dragon_inn_outside": {
        "x": 4.6,
        "y": 0
      },
      "room:green_dragon_inn": {
        "x": 4.6,
        "y": -1.05
      },
      "room:dreary": {
        "x": 5.752074748168498,
        "y": 0
      },
      "room:trolls_clearing": {
        "x": 6.85,
        "y": -1.05
      },
      "room:hidden_path": {
        "x": 6.85,
        "y": -2.35
      },
      "room:trolls_cave": {
        "x": 6.85,
        "y": -3.4
      },
      "room:trollshaws_road": {
        "x": 7.95,
        "y": 0
      },
      "room:hidden_valley_path": {
        "x": 9.05,
        "y": 0
      },
      "region:rivendell": {
        "x": 10.2,
        "y": 0
      },
      "region:mountains": {
        "x": 11.285714285714285,
        "y": 0
      },
      "room:large_dry_cave": {
        "x": 12.285714285714285,
        "y": -1.0714285714285714
      },
      "room:narrow_dangerous_path": {
        "x": 13.357142857142856,
        "y": 0
      },
      "region:beorn": {
        "x": 14.785714285714285,
        "y": -1
      },
      "room:great_river": {
        "x": 14.785714285714285,
        "y": -2.357142857142857
      },
      "region:mirkwood": {
        "x": 17.07142857142857,
        "y": -1
      },
      "region:elven_halls": {
        "x": 18,
        "y": -2.357142857142857
      },
      "room:treeless_opening": {
        "x": 13.357142857142856,
        "y": -1
      },
      "room:mountains": {
        "x": 15.642857142857142,
        "y": -3.4285714285714284
      },
      "room:forest_river": {
        "x": 16.5,
        "y": -2.357142857142857
      },
      "region:goblin_tunnels": {
        "x": 12.285714285714285,
        "y": -2.2857142857142856
      },
      "room:bilbos_garden": {
        "x": 0.5,
        "y": 0
      },
      "room:narrow_place": {
        "x": 12.285714285714285,
        "y": 0
      }
    },
    "connectors": {
      "room:trolls_clearing|room:trollshaws_road": {
        "route": "auto",
        "sourceSide": "auto",
        "targetSide": "auto",
        "waypoints": [],
        "lanes": {
          "tw:room:trolls_clearing>room:trollshaws_road:south east:north west": {
            "route": "straight",
            "sourceSide": "auto",
            "targetSide": "auto",
            "waypoints": []
          }
        }
      },
      "room:dreary|room:trolls_clearing": {
        "route": "auto",
        "sourceSide": "auto",
        "targetSide": "auto",
        "waypoints": [],
        "lanes": {
          "tw:room:dreary>room:trolls_clearing:east:south west": {
            "route": "straight",
            "sourceSide": "auto",
            "targetSide": "auto",
            "waypoints": []
          }
        }
      },
      "region:goblin_tunnels|room:large_dry_cave": {
        "route": "auto",
        "sourceSide": "auto",
        "targetSide": "auto",
        "waypoints": [],
        "lanes": {
          "tw:region:goblin_tunnels>room:large_dry_cave:up:down": {
            "route": "auto",
            "sourceSide": "south",
            "targetSide": "north",
            "waypoints": []
          }
        }
      },
      "region:mountains|room:narrow_place": {
        "route": "straight",
        "sourceSide": "east",
        "targetSide": "west",
        "waypoints": [],
        "lanes": {}
      },
      "room:forest_river|room:mountains": {
        "route": "auto",
        "sourceSide": "auto",
        "targetSide": "auto",
        "waypoints": [],
        "lanes": {
          "tw:room:forest_river>room:mountains:north west:south east": {
            "route": "straight",
            "sourceSide": "auto",
            "targetSide": "auto",
            "waypoints": []
          },
          "ow:room:forest_river>room:mountains:north:south": {
            "route": "auto",
            "sourceSide": "auto",
            "targetSide": "east",
            "waypoints": []
          }
        }
      },
      "room:great_river|room:mountains": {
        "route": "auto",
        "sourceSide": "auto",
        "targetSide": "auto",
        "waypoints": [],
        "lanes": {
          "ow:room:mountains>room:great_river:south west:north east": {
            "route": "straight",
            "sourceSide": "auto",
            "targetSide": "auto",
            "waypoints": []
          }
        }
      },
      "region:beorn|room:narrow_dangerous_path": {
        "route": "auto",
        "sourceSide": "auto",
        "targetSide": "auto",
        "waypoints": [],
        "lanes": {
          "tw:region:beorn>room:narrow_dangerous_path:south west:east": {
            "route": "straight",
            "sourceSide": "south west",
            "targetSide": "auto",
            "waypoints": []
          }
        }
      }
    }
  },
  "regions": {
    "bilbo_home": {
      "label": "Bilbo's Home",
      "rooms": [
        "hobbit_hole",
        "bag_end_parlour",
        "bag_end_study",
        "bag_end_dining_room",
        "bag_end_pantry",
        "bag_end_kitchen",
        "bag_end_guest_room",
        "bag_end_cellar_room"
      ],
      "nodes": {
        "hobbit_hole": {
          "x": 0,
          "y": 0
        },
        "bag_end_parlour": {
          "x": -1.2,
          "y": 0
        },
        "bag_end_study": {
          "x": 1.2,
          "y": -1.1
        },
        "bag_end_dining_room": {
          "x": 0,
          "y": 1.15
        },
        "bag_end_pantry": {
          "x": 1.25,
          "y": 1.15
        },
        "bag_end_kitchen": {
          "x": 2.5,
          "y": 1.15
        },
        "bag_end_guest_room": {
          "x": -1.2,
          "y": 1.1
        },
        "bag_end_cellar_room": {
          "x": 0,
          "y": 2.3
        }
      },
      "connectors": {
        "room:bag_end_study|room:hobbit_hole": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:bag_end_study>room:hobbit_hole:south west:north east": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        }
      }
    },
    "green_dragon": {
      "label": "Green Dragon Inn",
      "rooms": [
        "green_dragon_inn_outside",
        "green_dragon_inn"
      ],
      "nodes": {
        "green_dragon_inn_outside": {
          "x": 0,
          "y": 0.8
        },
        "green_dragon_inn": {
          "x": 0,
          "y": -0.8
        }
      },
      "connectors": {}
    },
    "rivendell": {
      "label": "Rivendell",
      "rooms": [
        "rivendell",
        "rivendell_courtyard",
        "rivendell_library",
        "rivendell_hall_of_fire",
        "rivendell_guest_chambers",
        "rivendell_terrace",
        "rivendell_bridge"
      ],
      "nodes": {
        "rivendell": {
          "x": 0,
          "y": -1.7142857142857142
        },
        "rivendell_bridge": {
          "x": 0.8571428571428571,
          "y": -4.428571428571428
        },
        "rivendell_terrace": {
          "x": 0.8571428571428571,
          "y": -3.5
        },
        "rivendell_courtyard": {
          "x": 0,
          "y": -3.5
        },
        "rivendell_library": {
          "x": 0.8571428571428571,
          "y": -2.642857142857143
        },
        "rivendell_hall_of_fire": {
          "x": 0,
          "y": -0.5
        },
        "rivendell_guest_chambers": {
          "x": -1.0396949404761906,
          "y": -2.644574652777778
        }
      },
      "connectors": {
        "room:rivendell|room:rivendell_guest_chambers": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:rivendell>room:rivendell_guest_chambers:north west:south east": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:rivendell|room:rivendell_library": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:rivendell>room:rivendell_library:north east:south west": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        }
      }
    },
    "beorn": {
      "label": "Beorn's House",
      "rooms": [
        "beorns_house",
        "beorn_great_hall",
        "beorn_stable",
        "beorn_garden",
        "beorn_animal_yard"
      ],
      "nodes": {
        "beorns_house": {
          "x": 1.1428571428571428,
          "y": 0
        },
        "beorn_great_hall": {
          "x": 2.2857142857142856,
          "y": 0
        },
        "beorn_stable": {
          "x": 2.2857142857142856,
          "y": 1.2142857142857142
        },
        "beorn_garden": {
          "x": 2.2857142857142856,
          "y": -1.1428571428571428
        },
        "beorn_animal_yard": {
          "x": 3.642857142857143,
          "y": -1.1428571428571428
        }
      },
      "connectors": {}
    },
    "mountains": {
      "label": "Misty Mountains",
      "rooms": [
        "misty_mountain",
        "narrow_ledge",
        "mountain_lookout",
        "storm_shelter",
        "narrow_path_1",
        "narrow_path_2",
        "narrow_path_3",
        "narrow_path_4",
        "narrow_path_5",
        "narrow_path_6",
        "narrow_path_7",
        "narrow_path_8",
        "narrow_path_9",
        "narrow_path_10",
        "steep_path_6",
        "steep_path_7",
        "steep_path_8",
        "deep_misty_valley_1",
        "deep_misty_valley_2"
      ],
      "nodes": {
        "misty_mountain": {
          "x": -0.2857142857142857,
          "y": 1
        },
        "narrow_ledge": {
          "x": -1.2142857142857142,
          "y": 0
        },
        "mountain_lookout": {
          "x": -1.2142857142857142,
          "y": -1.1428571428571428
        },
        "storm_shelter": {
          "x": -2.4,
          "y": 0
        },
        "narrow_path_1": {
          "x": -0.2857142857142857,
          "y": -0.7142857142857142
        },
        "narrow_path_2": {
          "x": 1,
          "y": -1.7857142857142856
        },
        "narrow_path_3": {
          "x": 1,
          "y": -2.7857142857142856
        },
        "narrow_path_4": {
          "x": 3.571428571428571,
          "y": 0.42857142857142855
        },
        "narrow_path_5": {
          "x": 5.285714285714286,
          "y": -1.2142857142857142
        },
        "narrow_path_6": {
          "x": 3.571428571428571,
          "y": 1.9285714285714284
        },
        "narrow_path_7": {
          "x": 1,
          "y": 1.9285714285714284
        },
        "narrow_path_8": {
          "x": -0.2857142857142857,
          "y": 2.4285714285714284
        },
        "narrow_path_9": {
          "x": 5.285714285714286,
          "y": -2.142857142857143
        },
        "narrow_path_10": {
          "x": 5.285714285714286,
          "y": -3.3571428571428568
        },
        "steep_path_6": {
          "x": 5.285714285714286,
          "y": -0.2857142857142857
        },
        "steep_path_7": {
          "x": 5.285714285714286,
          "y": 0.6428571428571428
        },
        "steep_path_8": {
          "x": 5.285714285714286,
          "y": 1.5
        },
        "deep_misty_valley_1": {
          "x": 4.928571428571428,
          "y": 3.2857142857142856
        },
        "deep_misty_valley_2": {
          "x": 6.357142857142857,
          "y": 3.2857142857142856
        }
      },
      "connectors": {
        "room:misty_mountain|room:narrow_path_2": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:narrow_path_2>room:misty_mountain:south:north": {
              "route": "auto",
              "sourceSide": "north east",
              "targetSide": "south",
              "waypoints": []
            }
          }
        },
        "room:narrow_path_1|room:narrow_path_2": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:narrow_path_1>room:narrow_path_2:north east:south west": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:misty_mountain|room:narrow_ledge": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:misty_mountain>room:narrow_ledge:north west:south east": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:misty_mountain|room:narrow_path_7": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:narrow_path_7>room:misty_mountain:north:south": {
              "route": "straight",
              "sourceSide": "south east",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:narrow_path_1|room:narrow_path_10": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:narrow_path_10>room:narrow_path_1:west:east": {
              "route": "auto",
              "sourceSide": "north",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:narrow_path_4|room:narrow_path_5": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:narrow_path_5>room:narrow_path_4:south west:north east": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:narrow_path_3|room:narrow_path_5": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:narrow_path_3>room:narrow_path_5:south east:north west": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:deep_misty_valley_1|room:deep_misty_valley_2": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:deep_misty_valley_1>room:deep_misty_valley_2:east:west": {
              "route": "auto",
              "sourceSide": "auto",
              "targetSide": "west",
              "waypoints": []
            }
          }
        },
        "room:deep_misty_valley_2|room:narrow_path_6": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:deep_misty_valley_2>room:narrow_path_6:up:": {
              "route": "auto",
              "sourceSide": "north",
              "targetSide": "auto",
              "waypoints": [
                {
                  "x": 1619.3,
                  "y": 1065.5
                }
              ]
            }
          }
        },
        "room:narrow_path_8|room:narrow_path_9": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:narrow_path_8>room:narrow_path_9:east:west": {
              "route": "auto",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": [
                {
                  "x": 1342.5,
                  "y": 1148
                },
                {
                  "x": 1347,
                  "y": 376.5
                }
              ]
            }
          }
        }
      }
    },
    "goblin_tunnels": {
      "label": "Goblin Tunnels",
      "rooms": [
        "goblins_dungeon",
        "dark_winding_passage",
        "big_cavern",
        "dark_stuffy_passage_1",
        "dark_stuffy_passage_2",
        "dark_stuffy_passage_3",
        "dark_stuffy_passage_4",
        "dark_stuffy_passage_5",
        "dark_stuffy_passage_6",
        "dark_stuffy_passage_7",
        "dark_stuffy_passage_8",
        "dark_stuffy_passage_9",
        "dark_stuffy_passage_10",
        "dark_stuffy_passage_11",
        "dark_stuffy_passage_12",
        "dark_stuffy_passage_13",
        "dark_stuffy_passage_14",
        "dark_stuffy_passage_15",
        "inside_goblins_gate",
        "outside_goblins_gate",
        "deep_dark_lake"
      ],
      "nodes": {
        "goblins_dungeon": {
          "x": -6,
          "y": 0.8
        },
        "dark_winding_passage": {
          "x": -4.5,
          "y": 0.8
        },
        "big_cavern": {
          "x": -4.5,
          "y": -0.8
        },
        "dark_stuffy_passage_1": {
          "x": -3,
          "y": 2
        },
        "dark_stuffy_passage_2": {
          "x": -1.5,
          "y": 0.8
        },
        "dark_stuffy_passage_3": {
          "x": -1.5,
          "y": -0.8
        },
        "dark_stuffy_passage_4": {
          "x": -1.5,
          "y": -2.4
        },
        "dark_stuffy_passage_5": {
          "x": 0,
          "y": 0.8
        },
        "dark_stuffy_passage_6": {
          "x": 1.5,
          "y": 0.8
        },
        "dark_stuffy_passage_7": {
          "x": 1.5,
          "y": 2.4
        },
        "dark_stuffy_passage_8": {
          "x": 4.8,
          "y": 4
        },
        "dark_stuffy_passage_9": {
          "x": 3.2,
          "y": 4
        },
        "dark_stuffy_passage_10": {
          "x": 3.2,
          "y": 2.4
        },
        "dark_stuffy_passage_11": {
          "x": 4.8,
          "y": 2.4
        },
        "dark_stuffy_passage_12": {
          "x": -1.5,
          "y": 2.4
        },
        "dark_stuffy_passage_13": {
          "x": 4.8,
          "y": 0.8
        },
        "deep_dark_lake": {
          "x": 6.4,
          "y": 0.8
        },
        "dark_stuffy_passage_14": {
          "x": 3.2,
          "y": 0.8
        },
        "dark_stuffy_passage_15": {
          "x": 0,
          "y": -2.4
        },
        "inside_goblins_gate": {
          "x": -1.5,
          "y": -4
        },
        "outside_goblins_gate": {
          "x": -1.5,
          "y": -5.4
        }
      },
      "connectors": {}
    },
    "mirkwood": {
      "label": "Mirkwood",
      "rooms": [
        "gate_to_mirkwood",
        "forest_road",
        "forest_road_2",
        "forest",
        "waterfall",
        "running_river",
        "bewitched_gloomy_place",
        "west_bank",
        "east_bank",
        "green_forest",
        "place_of_black_spiders",
        "forest_of_tangled_smothering_trees",
        "deep_bog",
        "mirkwood_forest_path",
        "mirkwood_spider_grove",
        "mirkwood_dark_glade",
        "mirkwood_enchanted_stream",
        "mirkwood_deer_trail",
        "mirkwood_fallen_tree_crossing",
        "mirkwood_ruined_clearing"
      ],
      "nodes": {
        "gate_to_mirkwood": {
          "x": 0.5714285714285714,
          "y": -1.7857142857142856
        },
        "forest_road": {
          "x": -0.8571428571428571,
          "y": 0.7142857142857142
        },
        "forest_road_2": {
          "x": 0.7142857142857142,
          "y": 0.3571428571428571
        },
        "forest": {
          "x": 1.7857142857142856,
          "y": 0.3571428571428571
        },
        "waterfall": {
          "x": 2.7857142857142856,
          "y": -0.8571428571428571
        },
        "running_river": {
          "x": 2.7857142857142856,
          "y": 1.4285714285714284
        },
        "bewitched_gloomy_place": {
          "x": 1.5714285714285714,
          "y": -1.7857142857142856
        },
        "west_bank": {
          "x": 2.7857142857142856,
          "y": -1.7857142857142856
        },
        "east_bank": {
          "x": 4.214285714285714,
          "y": -1.7857142857142856
        },
        "green_forest": {
          "x": 5.357142857142857,
          "y": -1.7857142857142856
        },
        "deep_bog": {
          "x": 8.357142857142856,
          "y": 0.5
        },
        "mirkwood_forest_path": {
          "x": 1.5714285714285714,
          "y": 2.642857142857143
        },
        "mirkwood_dark_glade": {
          "x": 3.642857142857143,
          "y": 2.642857142857143
        },
        "mirkwood_deer_trail": {
          "x": 3.642857142857143,
          "y": 1.4285714285714284
        },
        "mirkwood_enchanted_stream": {
          "x": 4.857142857142857,
          "y": 2.642857142857143
        },
        "mirkwood_fallen_tree_crossing": {
          "x": 4.857142857142857,
          "y": 1.5714285714285714
        },
        "mirkwood_spider_grove": {
          "x": 5.928571428571428,
          "y": 1.5714285714285714
        },
        "mirkwood_ruined_clearing": {
          "x": 5.928571428571428,
          "y": 0.5
        },
        "place_of_black_spiders": {
          "x": 7.357142857142857,
          "y": 0.5
        },
        "forest_of_tangled_smothering_trees": {
          "x": 7.357142857142857,
          "y": 1.4285714285714284
        }
      },
      "connectors": {
        "room:forest_road|room:gate_to_mirkwood": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:forest_road>room:gate_to_mirkwood:north east:south west": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:forest_road|room:mirkwood_forest_path": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:forest_road>room:mirkwood_forest_path:south east:north west": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:forest|room:forest_road_2": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:forest>room:forest_road_2:west:east": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:forest_road_2|room:running_river": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:running_river>room:forest_road_2:west:east": {
              "route": "auto",
              "sourceSide": "south",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:forest_road_2|room:waterfall": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:waterfall>room:forest_road_2:west:east": {
              "route": "auto",
              "sourceSide": "north",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:forest|room:waterfall": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:forest>room:waterfall:east:west": {
              "route": "auto",
              "sourceSide": "auto",
              "targetSide": "south west",
              "waypoints": []
            }
          }
        },
        "room:forest_of_tangled_smothering_trees|room:green_forest": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:forest_of_tangled_smothering_trees>room:green_forest:west:east": {
              "route": "auto",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": [
                {
                  "x": 1458.7,
                  "y": 712.8
                },
                {
                  "x": 1455.9,
                  "y": 173.6
                }
              ]
            }
          }
        },
        "room:green_forest|room:place_of_black_spiders": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:green_forest>room:place_of_black_spiders:north east:south west": {
              "route": "auto",
              "sourceSide": "north east",
              "targetSide": "auto",
              "waypoints": [
                {
                  "x": 1340.3,
                  "y": 50
                },
                {
                  "x": 1678.8,
                  "y": 50.6
                },
                {
                  "x": 1677.4,
                  "y": 435.4
                }
              ]
            }
          }
        }
      }
    },
    "elven_halls": {
      "label": "Elvenking's Halls",
      "rooms": [
        "elvish_clearing",
        "elvenkings_halls",
        "dark_dungeon",
        "cellar",
        "elven_prison_cells",
        "elven_guard_post",
        "elven_feast_hall",
        "elven_underground_river",
        "elven_storage_rooms"
      ],
      "nodes": {
        "elvish_clearing": {
          "x": 0.9285714285714285,
          "y": 0.7142857142857142
        },
        "elvenkings_halls": {
          "x": 2.2857142857142856,
          "y": -0.14285714285714285
        },
        "elven_guard_post": {
          "x": 2.2857142857142856,
          "y": -1.857142857142857
        },
        "elven_feast_hall": {
          "x": 3.3571428571428568,
          "y": -1.857142857142857
        },
        "dark_dungeon": {
          "x": 3.3571428571428568,
          "y": -0.14285714285714285
        },
        "elven_prison_cells": {
          "x": 3.3571428571428568,
          "y": -1
        },
        "cellar": {
          "x": 2.2857142857142856,
          "y": 1.2142857142857142
        },
        "elven_storage_rooms": {
          "x": 3.3571428571428568,
          "y": 1.2142857142857142
        },
        "elven_underground_river": {
          "x": 3.3571428571428568,
          "y": 2.357142857142857
        }
      },
      "connectors": {
        "room:elven_feast_hall|room:elvenkings_halls": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:elven_feast_hall>room:elvenkings_halls:south west:north east": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:cellar|room:dark_dungeon": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:cellar>room:dark_dungeon:north east:south west": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:elvenkings_halls|room:elvish_clearing": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:elvenkings_halls>room:elvish_clearing:west:north east": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:cellar|room:elven_underground_river": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:cellar>room:elven_underground_river:south east:north west": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        }
      }
    },
    "long_lake": {
      "label": "Long Lake",
      "parentScope": "elven_halls",
      "hostRoomId": "cellar",
      "rooms": [
        "long_lake",
        "strong_river",
        "wooden_town",
        "laketown_marketplace",
        "laketown_docks",
        "laketown_town_square",
        "laketown_bridges",
        "laketown_warehouses",
        "laketown_tavern",
        "bleak_barren_land",
        "ruins_of_the_town_of_dale",
        "stoe_of_ravenhill",
        "little_steep_bay",
        "front_gate"
      ],
      "nodes": {
        "long_lake": {
          "x": 0.42857142857142855,
          "y": 0
        },
        "strong_river": {
          "x": 0.42857142857142855,
          "y": -1.0714285714285714
        },
        "wooden_town": {
          "x": 2.4285714285714284,
          "y": 0
        },
        "laketown_marketplace": {
          "x": 3.5,
          "y": -1.0714285714285714
        },
        "laketown_docks": {
          "x": 3.5,
          "y": 1
        },
        "laketown_town_square": {
          "x": 1.4285714285714284,
          "y": -1.0714285714285714
        },
        "laketown_bridges": {
          "x": 2.4285714285714284,
          "y": 1
        },
        "laketown_warehouses": {
          "x": 3.5,
          "y": 0.07142857142857142
        },
        "laketown_tavern": {
          "x": 2.4285714285714284,
          "y": 2.071428571428571
        },
        "bleak_barren_land": {
          "x": 0.42857142857142855,
          "y": -2.142857142857143
        },
        "ruins_of_the_town_of_dale": {
          "x": 2.2857142857142856,
          "y": -3.071428571428571
        },
        "stoe_of_ravenhill": {
          "x": -0.5714285714285714,
          "y": -4.142857142857142
        },
        "little_steep_bay": {
          "x": -0.5714285714285714,
          "y": -5.071428571428571
        },
        "front_gate": {
          "x": 2.2857142857142856,
          "y": -4.142857142857142
        }
      },
      "connectors": {
        "room:laketown_town_square|room:wooden_town": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:laketown_town_square>room:wooden_town:south east:north west": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:laketown_docks|room:wooden_town": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:laketown_docks>room:wooden_town:north west:south east": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:laketown_marketplace|room:wooden_town": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "tw:room:laketown_marketplace>room:wooden_town:south west:north east": {
              "route": "straight",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:ruins_of_the_town_of_dale|room:stoe_of_ravenhill": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:ruins_of_the_town_of_dale>room:stoe_of_ravenhill:north west:south east": {
              "route": "auto",
              "sourceSide": "auto",
              "targetSide": "south",
              "waypoints": []
            }
          }
        },
        "room:bleak_barren_land|room:stoe_of_ravenhill": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:stoe_of_ravenhill>room:bleak_barren_land:south east:north west": {
              "route": "auto",
              "sourceSide": "auto",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        }
      }
    },
    "erebor_inner": {
      "label": "Erebor",
      "parentScope": "long_lake",
      "hostRoomId": "front_gate",
      "rooms": [
        "erebor_hidden_door",
        "erebor_watch_chamber",
        "erebor_upper_tunnels",
        "erebor_ancient_armoury",
        "erebor_abandoned_workshop",
        "erebor_great_hall",
        "erebor_treasure_approach",
        "lower_halls",
        "smooth_straight_passage",
        "empty_place",
        "lonely_mountain"
      ],
      "nodes": {
        "erebor_hidden_door": {
          "x": 0.2857142857142857,
          "y": 0.5714285714285714
        },
        "erebor_watch_chamber": {
          "x": 1.4285714285714284,
          "y": 0.5714285714285714
        },
        "erebor_upper_tunnels": {
          "x": 2.642857142857143,
          "y": 0.5714285714285714
        },
        "erebor_ancient_armoury": {
          "x": 2.642857142857143,
          "y": 1.7857142857142856
        },
        "erebor_abandoned_workshop": {
          "x": 3.714285714285714,
          "y": 0.5714285714285714
        },
        "erebor_great_hall": {
          "x": 3.714285714285714,
          "y": -0.3571428571428571
        },
        "erebor_treasure_approach": {
          "x": 4.928571428571428,
          "y": -0.3571428571428571
        },
        "lower_halls": {
          "x": 7.7142857142857135,
          "y": -0.3571428571428571
        },
        "smooth_straight_passage": {
          "x": 6.2142857142857135,
          "y": -1.357142857142857
        },
        "empty_place": {
          "x": 9.428571428571429,
          "y": -0.2857142857142857
        },
        "lonely_mountain": {
          "x": 8.071428571428571,
          "y": -1.7857142857142856
        }
      },
      "connectors": {
        "room:lower_halls|room:smooth_straight_passage": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:lower_halls>room:smooth_straight_passage:east:west": {
              "route": "auto",
              "sourceSide": "east",
              "targetSide": "south east",
              "waypoints": [
                {
                  "x": 1591.5,
                  "y": 412.1
                },
                {
                  "x": 1591.9,
                  "y": 619.1
                },
                {
                  "x": 1327.4,
                  "y": 619.9
                },
                {
                  "x": 1324.5,
                  "y": 336.4
                }
              ]
            },
            "ow:room:smooth_straight_passage>room:lower_halls:east:west": {
              "route": "auto",
              "sourceSide": "north",
              "targetSide": "auto",
              "waypoints": []
            }
          }
        },
        "room:empty_place|room:lonely_mountain": {
          "route": "auto",
          "sourceSide": "auto",
          "targetSide": "auto",
          "waypoints": [],
          "lanes": {
            "ow:room:empty_place>room:lonely_mountain:up:": {
              "route": "auto",
              "sourceSide": "auto",
              "targetSide": "east",
              "waypoints": [
                {
                  "x": 1730.1,
                  "y": 173.9
                }
              ]
            }
          }
        }
      }
    }
  },
  "labelOverrides": {
    "hidden_path": "Trolls Path",
    "large_dry_cave": "Dry Cave",
    "goblins_dungeon": "Goblin Dungeon",
    "dark_winding_passage": "Winding Passage",
    "inside_goblins_gate": "Goblin Gate In",
    "outside_goblins_gate": "Goblin Gate Out",
    "narrow_path_1": "Path 1",
    "narrow_path_2": "Path 2",
    "narrow_path_3": "Path 3",
    "narrow_path_4": "Path 4",
    "narrow_path_5": "Path 5",
    "narrow_path_6": "Path 6",
    "narrow_path_7": "Path 7",
    "narrow_path_8": "Path 8",
    "narrow_path_9": "Path 9",
    "narrow_path_10": "Path 10",
    "dark_stuffy_passage_1": "Tunnel 1",
    "dark_stuffy_passage_2": "Tunnel 2",
    "dark_stuffy_passage_3": "Tunnel 3",
    "dark_stuffy_passage_4": "Tunnel 4",
    "dark_stuffy_passage_5": "Tunnel 5",
    "dark_stuffy_passage_6": "Tunnel 6",
    "dark_stuffy_passage_7": "Tunnel 7",
    "dark_stuffy_passage_8": "Tunnel 8",
    "dark_stuffy_passage_9": "Tunnel 9",
    "dark_stuffy_passage_10": "Tunnel 10",
    "dark_stuffy_passage_11": "Tunnel 11",
    "dark_stuffy_passage_12": "Tunnel 12",
    "dark_stuffy_passage_13": "Tunnel 13",
    "dark_stuffy_passage_14": "Tunnel 14",
    "dark_stuffy_passage_15": "Tunnel 15"
  },
  "inlineRegionHosts": {
    "goblin_tunnels": "large_dry_cave"
  },
  "inlineRegionsInWorld": [
    "green_dragon"
  ],
  "drilldownDisabled": [
    "green_dragon"
  ]
};
}());
