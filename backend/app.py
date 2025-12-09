import os
import jwt
import datetime
from functools import wraps
from flask import Flask, request, jsonify
from flasgger import Swagger
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
# models dosyasından db ve diğer sınıfları çekiyoruz
from models import db, Masa, SiparisKalemi, User, get_masa_toplam_tutar

app = Flask(__name__)
# CORS ayarlarını genişletiyoruz
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# --- Yapılandırma ---
# Docker Compose'dan gelen DATABASE_URL'i kullanır. Yoksa yerel SQLite kullanır.
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    db_url = 'sqlite:///smartbill.db'
    print("--- UYARI: DATABASE_URL bulunamadı, yerel SQLite kullanılıyor (smartbill.db) ---")

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'gizli_anahtar_buraya') # Güvenlik için env'den alınmalı

# Swagger'ı başlat
swagger = Swagger(app)

# --- Veritabanı Bağlantısı ---
# db nesnesini Flask uygulamasıyla (app) başlatıyoruz
db.init_app(app)

# Uygulama başlarken tabloları oluştur (Migration yerine hızlı çözüm)
with app.app_context():
    try:
        db.create_all()
        print("--- Veritabanı tabloları başarıyla oluşturuldu/kontrol edildi ---")
    except Exception as e:
        print(f"--- DB Bağlantı Hatası: {e} ---")

# --- Auth Decorator ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Header'da 'Authorization: Bearer <token>' formatı beklenir
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token eksik!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token süresi doldu!'}), 403
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Geçersiz token!'}), 403
        except Exception as e:
             return jsonify({'message': f'Token hatası: {str(e)}'}), 403

        return f(current_user, *args, **kwargs)
    
    return decorated

# --- Auth Routes ---

@app.route('/register', methods=['POST'])
def register():
    """
    Kullanıcı Kaydı
    ---
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
            password:
              type: string
    responses:
      201:
        description: Kullanıcı oluşturuldu
      400:
        description: Kullanıcı zaten var
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Kullanıcı adı ve şifre gereklidir"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Bu kullanıcı adı zaten alınmış"}), 400

    hashed_password = generate_password_hash(password)
    new_user = User(username=username, password=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Kullanıcı başarıyla oluşturuldu"}), 201

@app.route('/login', methods=['POST'])
def login():
    """
    Kullanıcı Girişi ve Token Alma
    ---
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
            password:
              type: string
    responses:
      200:
        description: Giriş başarılı, token döner
      401:
        description: Hatalı giriş
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Kullanıcı adı ve şifre gereklidir"}), 400

    user = User.query.filter_by(username=username).first()

    if user and check_password_hash(user.password, password):
        # Token oluştur (30 dakika geçerli)
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=30)
        }, app.config['SECRET_KEY'], algorithm="HS256")

        return jsonify({'token': token})

    return jsonify({"error": "Kullanıcı adı veya şifre hatalı"}), 401

# --- Route'lar ---

@app.route('/')
def home():
    """
    Ana Sayfa Kontrolü
    ---
    responses:
      200:
        description: API çalışıyor
    """
    return jsonify({"message": "SmartBill API Calisiyor", "status": "active"})

@app.route('/masalar', methods=['POST'])
@token_required
def masa_olustur(current_user):
    """
    Yeni Masa Oluştur
    ---
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            id:
              type: string
              example: "Masa-1"
            masa_adi:
              type: string
              example: "Bahçe Masa 1"
    responses:
      201:
        description: Masa oluşturuldu
      400:
        description: Hatalı istek veya ID zaten var
    """
    data = request.get_json()
    masa_id = data.get('id') # String bekliyoruz
    masa_adi = data.get('masa_adi')

    if not masa_id or not masa_adi:
        return jsonify({"error": "id ve masa_adi gereklidir"}), 400

    # Veritabanında bu ID var mı kontrolü
    mevcut_masa = Masa.query.get(masa_id)
    if mevcut_masa:
        return jsonify({"error": f"'{masa_id}' ID'li masa zaten mevcut"}), 400

    yeni_masa = Masa(id=masa_id, masa_adi=masa_adi)
    db.session.add(yeni_masa)
    db.session.commit()

    return jsonify({"message": "Masa başarıyla oluşturuldu", "masa_id": yeni_masa.id}), 201

@app.route('/masalar', methods=['GET'])
@token_required
def masalari_getir(current_user):
    """
    Tüm Masaları ve Durumlarını Listele
    ---
    security:
      - Bearer: []
    responses:
      200:
        description: Masalar listelendi
    """
    masalar = Masa.query.all()
    ozet = []
    for masa in masalar:
        toplam_siparis = get_masa_toplam_tutar(masa.id)
        kalan_odeme = toplam_siparis - masa.odenen_tutar
        
        # Yuvarlama işlemi
        ozet.append({
            "id": masa.id,
            "ad": masa.masa_adi,
            "toplam_siparis_tutari": round(toplam_siparis, 2),
            "odenen_tutar": round(masa.odenen_tutar, 2),
            "kalan_bakiye": round(kalan_odeme, 2),
            "durum": "Musait" if kalan_odeme <= 0 and toplam_siparis == 0 else "Dolu"
        })
    return jsonify(ozet)

@app.route('/masalar/<masa_id>', methods=['GET'])
@token_required
def masa_detay_getir(current_user, masa_id):
    """
    Tek Bir Masanın Detaylarını ve Siparişlerini Getir
    ---
    security:
      - Bearer: []
    parameters:
      - in: path
        name: masa_id
        type: string
        required: true
        description: Masa ID
    responses:
      200:
        description: Masa detayları
      404:
        description: Masa bulunamadı
    """
    masa = Masa.query.get(masa_id)
    if not masa:
        return jsonify({"error": "Masa bulunamadı"}), 404

    toplam_siparis = get_masa_toplam_tutar(masa.id)
    kalan_odeme = toplam_siparis - masa.odenen_tutar
    
    siparisler = []
    for siparis in masa.siparisler:
        siparisler.append({
            "id": siparis.id,
            "ad": siparis.ad,
            "tutar": siparis.tutar
        })

    return jsonify({
        "id": masa.id,
        "ad": masa.masa_adi,
        "toplam_siparis_tutari": round(toplam_siparis, 2),
        "odenen_tutar": round(masa.odenen_tutar, 2),
        "kalan_bakiye": round(kalan_odeme, 2),
        "siparisler": siparisler
    })

@app.route('/siparis', methods=['POST'])
@token_required
def siparis_ekle(current_user):
    """
    Sipariş Ekle
    ---
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            masa_id:
              type: string
              example: "Masa-1"
            urun_adi:
              type: string
              example: "Cay"
            tutar:
              type: number
              example: 15.50
    responses:
      201:
        description: Sipariş eklendi
      404:
        description: Masa bulunamadı
    """
    data = request.get_json()
    masa_id = data.get('masa_id')
    urun_adi = data.get('urun_adi')
    tutar = data.get('tutar')

    if not all([masa_id, urun_adi, tutar]):
        return jsonify({"error": "masa_id, urun_adi ve tutar gereklidir"}), 400

    masa = Masa.query.get(masa_id)
    if not masa:
        return jsonify({"error": "Masa bulunamadı"}), 404

    yeni_siparis = SiparisKalemi(ad=urun_adi, tutar=float(tutar), masa_id=masa_id)
    db.session.add(yeni_siparis)
    db.session.commit()

    return jsonify({
        "message": "Sipariş eklendi",
        "masa": masa.masa_adi,
        "urun": urun_adi,
        "fiyat": tutar
    }), 201

@app.route('/odeme', methods=['POST'])
@token_required
def odeme_yap(current_user):
    """
    Ödeme Al
    ---
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            masa_id:
              type: string
              example: "Masa-1"
            tutar:
              type: number
              example: 50.0
    responses:
      200:
        description: Ödeme işlendi
    """
    data = request.get_json()
    masa_id = data.get('masa_id')
    odenen_miktar = data.get('tutar')

    if not masa_id or not odenen_miktar:
        return jsonify({"error": "masa_id ve tutar gereklidir"}), 400

    masa = Masa.query.get(masa_id)
    if not masa:
        return jsonify({"error": "Masa bulunamadı"}), 404

    masa.odenen_tutar += float(odenen_miktar)
    db.session.commit()

    toplam_borc = get_masa_toplam_tutar(masa_id)
    kalan = toplam_borc - masa.odenen_tutar

    return jsonify({
        "message": "Ödeme alındı",
        "odenen": odenen_miktar,
        "guncel_kalan_borc": round(kalan, 2)
    })

# DİKKAT: Buradaki <int:masa_id> kısmını sildim, sadece <masa_id> yaptım.
# Çünkü senin Masa modelinde ID string (örn: "masa1").
@app.route('/masalar/<masa_id>/sifirla', methods=['DELETE'])
@token_required
def masayi_sifirla(current_user, masa_id):
    """
    Masayı Sıfırla (Hesabı Kapat)
    ---
    security:
      - Bearer: []
    parameters:
      - in: path
        name: masa_id
        type: string
        required: true
        description: Masa ID
    responses:
      200:
        description: Masa sıfırlandı
    """
    masa = Masa.query.get(masa_id)
    if not masa:
        return jsonify({"error": "Masa bulunamadı"}), 404

    # İlişkili siparişleri sil (SQLAlchemy cascade ayarı yoksa manuel silmek gerekir)
    SiparisKalemi.query.filter_by(masa_id=masa_id).delete()
    
    masa.odenen_tutar = 0.0
    db.session.commit()

    return jsonify({"message": f"{masa.masa_adi} ({masa.id}) sıfırlandı ve yeni müşteriye hazır."})

@app.route('/masalar/<masa_id>', methods=['DELETE'])
@token_required
def masa_sil(current_user, masa_id):
    """
    Masa Sil
    ---
    security:
      - Bearer: []
    parameters:
      - in: path
        name: masa_id
        required: true
        type: string
    responses:
      200:
        description: Masa silindi
      404:
        description: Masa bulunamadı
    """
    masa = Masa.query.get(masa_id)
    if not masa:
        return jsonify({"error": "Masa bulunamadı"}), 404

    db.session.delete(masa)
    db.session.commit()
    return jsonify({"message": "Masa başarıyla silindi"}), 200

if __name__ == '__main__':
    # Docker için host='0.0.0.0' zorunludur.
    app.run(host='0.0.0.0', port=5000, debug=True)
