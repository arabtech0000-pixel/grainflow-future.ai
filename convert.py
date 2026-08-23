import re
import sys

def convert_server():
    with open('server.ts', 'r') as f:
        content = f.read()

    # Imports
    content = re.sub(
        r'import \{[\s\S]*?\} from "firebase/firestore";',
        'import { getDatabase, ref, set, get, child, update, serverTimestamp, query, orderByChild, equalTo, push } from "firebase/database";',
        content
    )

    # Init db
    content = re.sub(
        r'const db = firebaseConfig.firestoreDatabaseId[\s\S]*?getFirestore\(app\);',
        'const db = getDatabase(app, "https://elearning-e9601-default-rtdb.firebaseio.com");',
        content
    )

    # We need to manually fix the admin logic and transaction logic, which is hard with regex. 
    pass

convert_server()
