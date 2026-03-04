"""Check face recognition installation status"""
import sys

def check_face_recognition():
    """Check if face recognition is fully installed"""
    print("\n" + "="*50)
    print("  FACE RECOGNITION STATUS CHECK")
    print("="*50 + "\n")
    
    # Check face_recognition package
    try:
        import face_recognition
        print("[OK] face_recognition package: INSTALLED")
        face_rec_ok = True
    except ImportError as e:
        print(f"[ERROR] face_recognition: {e}")
        face_rec_ok = False
    
    # Check dlib
    try:
        import dlib
        print(f"[OK] dlib: INSTALLED (version: {dlib.__version__})")
        dlib_ok = True
    except ImportError as e:
        print(f"[MISSING] dlib: {e}")
        dlib_ok = False
    
    # Check Vision Engine integration
    try:
        from src.vision.face_recognition import FaceRecognitionEngine
        print("[OK] Vision Engine face recognition module: AVAILABLE")
        engine_ok = True
    except Exception as e:
        print(f"[ERROR] Vision Engine module: {e}")
        engine_ok = False
    
    print("\n" + "="*50)
    
    if face_rec_ok and dlib_ok and engine_ok:
        print("[SUCCESS] Face recognition is FULLY READY!")
        print("\nThe Vision Engine will automatically use face recognition.")
        return True
    elif face_rec_ok and not dlib_ok:
        print("[ACTION REQUIRED] Install dlib to enable face recognition")
        print("\nSteps:")
        print("1. Install CMake from: https://cmake.org/download/")
        print("2. Restart your terminal")
        print("3. Run: python -m pip install dlib")
        print("\nSee INSTALL_CMake_AND_DLIB.md for detailed instructions")
        return False
    else:
        print("[INCOMPLETE] Face recognition setup incomplete")
        return False

if __name__ == "__main__":
    success = check_face_recognition()
    sys.exit(0 if success else 1)
