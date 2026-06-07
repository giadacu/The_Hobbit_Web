import ast
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2] / "The Hobbit"
OUT = Path(__file__).resolve().parents[1] / "assets" / "game-data.js"
IMAGE_DIR = ROOT / "images"


def literal(node):
    if isinstance(node, ast.Name):
        if node.id in {"True", "False", "None"}:
            return {"True": True, "False": False, "None": None}[node.id]
        return {"$ref": node.id}
    try:
        return ast.literal_eval(node)
    except Exception:
        return ast.unparse(node)


def arg_values(call, positional_names):
    values = {}
    for index, arg in enumerate(call.args):
        key = positional_names[index] if index < len(positional_names) else f"arg{index}"
        values[key] = literal(arg)
    for kw in call.keywords:
        values[kw.arg] = literal(kw.value)
    return values


def parse_setup():
    image_names = {path.name.lower(): path.name for path in IMAGE_DIR.iterdir() if path.is_file()}
    tree = ast.parse((ROOT / "game_setup.py").read_text())
    data = {
        "rooms": {},
        "items": {},
        "doors": {},
        "characters": {},
        "connections": [],
        "roomOrder": [],
        "placements": [],
        "containerContents": [],
        "characterInventories": [],
        "characterPlacements": [],
        "startRoom": "Hobbit_hole",
        "player": "you",
    }

    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            var = node.targets[0].id
            if not isinstance(node.value, ast.Call):
                continue
            func = getattr(node.value.func, "id", None)
            if func == "Stanza":
                values = arg_values(node.value, ["name", "description", "image", "transformedImage"])
                image = values.get("image", "")
                transformed_image = values.get("transformedImage")
                if isinstance(image, str):
                    image = image_names.get(image.lower(), image)
                if isinstance(transformed_image, str):
                    transformed_image = image_names.get(transformed_image.lower(), transformed_image)
                data["rooms"][var] = {
                    "id": var,
                    "name": values.get("name", var),
                    "description": values.get("description", ""),
                    "image": image,
                    "transformedImage": transformed_image,
                    "sound": values.get("sound", ""),
                }
            elif func == "Oggetto":
                values = arg_values(node.value, ["name", "description"])
                data["items"][var] = {
                    "id": var,
                    "name": values.get("name", var).replace("the ", ""),
                    "description": values.get("description", ""),
                    "container": values.get("contenitore", False),
                    "keyFor": values.get("chiave_per"),
                    "portable": values.get("needs_to_be_picked_up", False),
                    "weight": values.get("peso", 0),
                    "strength": values.get("resistenza", 10),
                    "visible": values.get("visibile", True),
                    "open": values.get("aperto", False),
                    "locked": values.get("chiuso_a_chiave", False),
                    "requiredKey": values.get("chiave_richiesta"),
                    "weapon": values.get("weapon", False),
                    "noLid": values.get("has_no_lid", False),
                    "wearable": values.get("wearable", False),
                    "worn": values.get("worn", False),
                    "reveals": values.get("reveals"),
                    "specialChar": values.get("special_char"),
                }
            elif func == "Porta":
                values = arg_values(node.value, ["name"])
                data["doors"][var] = {
                    "id": var,
                    "name": values.get("name", var),
                    "open": values.get("aperta", False),
                    "locked": values.get("chiusa_a_chiave", False),
                    "requiredKey": values.get("chiave_richiesta"),
                }
            elif func == "Personaggio":
                values = arg_values(node.value, ["name", "friendly", "strength", "position", "movementMode"])
                position = values.get("position")
                data["characters"][var] = {
                    "id": var,
                    "name": values.get("name", var),
                    "friendly": values.get("friendly", True),
                    "strength": values.get("strength", 1),
                    "position": position.get("$ref") if isinstance(position, dict) else position,
                    "movementMode": values.get("movement_mode", values.get("movementMode", "always")),
                    "visible": True,
                }

        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
            call = node.value
            if not isinstance(call.func, ast.Attribute):
                continue
            method = call.func.attr
            owner = call.func.value.id if isinstance(call.func.value, ast.Name) else None
            values = [literal(arg) for arg in call.args]
            keywords = {kw.arg: literal(kw.value) for kw in call.keywords}

            if method == "collega" and owner and len(values) >= 2:
                target = values[1].get("$ref") if isinstance(values[1], dict) else values[1]
                door = None
                if len(values) >= 3:
                    door = values[2].get("$ref") if isinstance(values[2], dict) else values[2]
                data["connections"].append({
                    "from": owner,
                    "direction": values[0],
                    "to": target,
                    "door": door,
                    "distance": keywords.get("distanza", 0),
                })
            elif method == "aggiungi_stanza" and owner == "gioco" and values:
                room = values[0].get("$ref") if isinstance(values[0], dict) else values[0]
                data["roomOrder"].append(room)
            elif method == "aggiungi_oggetto" and owner and values:
                item = values[0].get("$ref") if isinstance(values[0], dict) else values[0]
                if owner in data["rooms"]:
                    data["placements"].append({"room": owner, "item": item})
                elif owner in data["characters"]:
                    data["characterInventories"].append({"character": owner, "item": item})
            elif method == "aggiungi_oggetto_interno" and owner and values:
                item = values[0].get("$ref") if isinstance(values[0], dict) else values[0]
                data["containerContents"].append({"container": owner, "item": item})
            elif method == "aggiungi_personaggio" and owner and values:
                character = values[0].get("$ref") if isinstance(values[0], dict) else values[0]
                data["characterPlacements"].append({"room": owner, "character": character})

    return data


def parse_assignments(path, names):
    tree = ast.parse((ROOT / path).read_text())
    found = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id in names:
                    found[target.id] = literal(node.value)
    return found


def parse_verbos():
    tree = ast.parse((ROOT / "game_verbos.py").read_text())
    result = []
    combinations = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "combinations":
                    combinations = literal(node.value)
        if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "Verbo":
            result.append(arg_values(node, [
                "verb", "desc1", "desc2", "obj1", "adverb", "obj2", "location",
                "flag_in1", "flag_in2", "flag_out", "special_char", "reveals", "destination"
            ]))
    return result, combinations


def main():
    data = parse_setup()
    parser_data = parse_assignments("parser.py", {"verbs", "directions", "synonyms", "adverbs"})
    responses = parse_assignments(
        "standard_responses.py",
        {"responses", "general_tips", "location_based_tips", "short_distance_sentences", "medium_distance_sentences", "long_distance_sentences"},
    )
    verbos, combinations = parse_verbos()
    data["parser"] = parser_data
    data["responses"] = responses
    data["specialActions"] = verbos
    data["combinations"] = {str(key): value for key, value in combinations.items()}

    OUT.write_text(
        "window.HOBBIT_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    )
    print(f"Wrote {OUT}")
    print(f"Rooms: {len(data['rooms'])}, items: {len(data['items'])}, characters: {len(data['characters'])}, connections: {len(data['connections'])}")


if __name__ == "__main__":
    main()
