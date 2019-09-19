import {
    Ed25519PrivateKey,
    Ed25519PublicKey,
    generateMnemonic,
    KeyMismatchException,
    ThresholdKey,
} from '../src/Keys';
import * as nacl from "tweetnacl";

// key from hedera-sdk-java tests, not used anywhere
const privKeyBytes = Uint8Array.of(
    -37, 72, 75, -126, -114, 100, -78, -40, -15, 44, -29, -64, -96, -23, 58, 11, -116, -50,
    122, -15, -69, -113, 57, -55, 119, 50, 57, 68, -126, 83, -114, 16);

const privKeyStr = '302e020100300506032b657004220420db484b828e64b2d8f12ce3c0a0e93a0b8cce7af1bb8f39c97732394482538e10';
const privAndPubKeyStr = 'db484b828e64b2d8f12ce3c0a0e93a0b8cce7af1bb8f39c97732394482538e10e0c8ec2758a5879ffac226a13c0c516b799e72e35141a0dd828f94d37988a4b7';
const rawPrivKeyStr = 'db484b828e64b2d8f12ce3c0a0e93a0b8cce7af1bb8f39c97732394482538e10';

const pubKeyBytes = Uint8Array.of(
    -32, -56, -20, 39, 88, -91, -121, -97, -6, -62, 38, -95, 60, 12, 81, 107, 121, -98, 114,
    -29, 81, 65, -96, -35, -126, -113, -108, -45, 121, -120, -92, -73);

const pubKeyStr = '302a300506032b6570032100e0c8ec2758a5879ffac226a13c0c516b799e72e35141a0dd828f94d37988a4b7';
const rawPubKeyStr = 'e0c8ec2758a5879ffac226a13c0c516b799e72e35141a0dd828f94d37988a4b7';

// generated by hedera-keygen-java, not used anywhere
const mnemonic = 'inmate flip alley wear offer often piece magnet surge toddler submit right radio absent pear floor belt raven price stove replace reduce plate home';
const mnemonicKey = '302e020100300506032b657004220420853f15aecd22706b105da1d709b4ac05b4906170c2b9c7495dff9af49e1391da';

// root key generated by the iOS wallet, not used anywhere
const iosWalletMnemonic = 'tiny denial casual grass skull spare awkward indoor ethics dash enough flavor good daughter early hard rug staff capable swallow raise flavor empty angle';

// private key for "default account", should be index 0
const iosWalletPrivKey = '5f66a51931e8c99089472e0d70516b6272b94dd772b967f8221e1077f966dbda2b60cf7ee8cf10ecd5a076bffad9a7c7b97df370ad758c0f1dd4ef738e04ceb6';

const iosWalletKeyBytes = Uint8Array.from(Buffer.from(iosWalletPrivKey, 'hex'));
const iosWalletPrivKeyBytes = iosWalletKeyBytes.subarray(0, 32);
const iosWalletPubKeyBytes = iosWalletKeyBytes.subarray(32);

// root key generated by the Android wallet, also not used anywhere
const androidWalletMnemonic = 'ramp april job flavor surround pyramid fish sea good know blame gate village viable include mixed term draft among monitor swear swing novel track';
// private key for "default account", should be index 0
const androidWalletPrivKey = 'c284c25b3a1458b59423bc289e83703b125c8eefec4d5aa1b393c2beb9f2bae66188a344ba75c43918ab12fa2ea4a92960eca029a2320d8c6a1c3b94e06c9985';

const androidWalletKeyBytes = Uint8Array.from(Buffer.from(androidWalletPrivKey, 'hex'));
const androidWalletPrivKeyBytes = androidWalletKeyBytes.subarray(0, 32);
const androidWalletPubKeyBytes = androidWalletKeyBytes.subarray(32);

const signTestData = Uint8Array.from(Buffer.from('this is the test data to sign', 'utf8'));

const passphrase = 'asdf1234';

describe('Ed25519PrivateKey', () => {
    it('toString() produces correctly encoded string', () => {
        const privateKey = Ed25519PrivateKey.fromBytes(privKeyBytes);
        expect(privateKey.toString()).toStrictEqual(privKeyStr);
        expect(privateKey.toString(true)).toStrictEqual(rawPrivKeyStr);
    });

    it('publicKey is the same', () => {
        const privateKey = Ed25519PrivateKey.fromBytes(privKeyBytes);
        expect(privateKey.publicKey.toBytes()).toStrictEqual(pubKeyBytes);
    });

    it('fromString returns correct value', () => {
        const privateKey = Ed25519PrivateKey.fromString(privKeyStr);
        expect(privateKey.toBytes()).toStrictEqual(privKeyBytes);

        const privateKey2 = Ed25519PrivateKey.fromString(privAndPubKeyStr);
        expect(privateKey2.toBytes()).toStrictEqual(privKeyBytes);

        const privateKey3 = Ed25519PrivateKey.fromString(rawPrivKeyStr);
        expect(privateKey3.toBytes()).toStrictEqual(privKeyBytes);

        const privateKey4 = Ed25519PrivateKey.fromString(iosWalletPrivKey);
        expect(privateKey4.toBytes()).toStrictEqual(iosWalletPrivKeyBytes);
        expect(privateKey4.publicKey.toBytes()).toStrictEqual(iosWalletPubKeyBytes);

        const privateKey5 = Ed25519PrivateKey.fromString(androidWalletPrivKey);
        expect(privateKey5.toBytes()).toStrictEqual(androidWalletPrivKeyBytes);
        expect(privateKey5.publicKey.toBytes()).toStrictEqual(androidWalletPubKeyBytes);
    });

    it('fromMnemonic() produces correct value', async () => {
        let key;

        // eslint-disable-next-line no-useless-catch
        try {
            key = await Ed25519PrivateKey.fromMnemonic(mnemonic);
        } catch (error) {
            // to get actual stack trace before Promise mangles it
            throw error;
        }

        expect(key.toString()).toStrictEqual(mnemonicKey);
    });

    it('createKeystore() creates loadable keystores', async () => {
        const key1 = Ed25519PrivateKey.fromBytes(privKeyBytes);
        const keystoreBytes = await key1.createKeystore(passphrase);
        const key2 = await Ed25519PrivateKey.fromKeystore(keystoreBytes, passphrase);

        expect(key1.toBytes()).toStrictEqual(key2.toBytes());

        // keystore with the wrong password should reject with a `KeyMismatchException`
        await expect(Ed25519PrivateKey.fromKeystore(keystoreBytes, 'some random password'))
            .rejects
            .toBeInstanceOf(KeyMismatchException);
    });

    it('derive() produces correct value', async () => {
        const iosKey = await Ed25519PrivateKey.fromMnemonic(iosWalletMnemonic);
        const iosChildKey = iosKey.derive(0);

        expect(iosChildKey.toBytes()).toStrictEqual(iosWalletPrivKeyBytes);
        expect(iosChildKey.publicKey.toBytes()).toStrictEqual(iosWalletPubKeyBytes);

        const iosSignature = iosChildKey.sign(signTestData);
        // `.open()` returns the unsigned data
        expect(nacl.sign.open(iosSignature, iosChildKey.publicKey.toBytes())).toStrictEqual(signTestData);

        const androidKey = await Ed25519PrivateKey.fromMnemonic(androidWalletMnemonic);
        const androidChildKey = androidKey.derive(0);

        expect(androidChildKey.toBytes()).toStrictEqual(androidWalletPrivKeyBytes);
        expect(androidChildKey.publicKey.toBytes()).toStrictEqual(androidWalletPubKeyBytes);

        const androidSignature = androidChildKey.sign(signTestData);
        expect(nacl.sign.open(androidSignature, androidChildKey.publicKey.toBytes())).toStrictEqual(signTestData);
    });
});

describe('Ed25519PublicKey', () => {
    it('toString() produces correctly encoded string', () => {
        const publicKey = new Ed25519PublicKey(pubKeyBytes);
        expect(publicKey.toString()).toStrictEqual(pubKeyStr);
        expect(publicKey.toString(true)).toStrictEqual(rawPubKeyStr);
    });

    it('fromString returns correct value', () => {
        const publicKey = Ed25519PublicKey.fromString(pubKeyStr);
        expect(publicKey.toBytes()).toStrictEqual(pubKeyBytes);

        const publicKey2 = Ed25519PublicKey.fromString(rawPubKeyStr);
        expect(publicKey2.toBytes()).toStrictEqual(pubKeyBytes);
    });
});

describe('ThresholdKey', () => {
    it('requires at least as many keys as its threshold', async () => {
        const key1 = await Ed25519PrivateKey.generate();
        const key2 = await Ed25519PrivateKey.generate();
        const key3 = await Ed25519PrivateKey.generate();

        const thresholdKey = new ThresholdKey(3);

        expect(() => thresholdKey.toProtoKey())
            .toThrow("ThresholdKey must have at least one key");

        thresholdKey.addAll(key1.publicKey, key2.publicKey);

        expect(() => thresholdKey.toProtoKey())
            .toThrow('ThresholdKey must have at least as many keys as threshold: 3; # of keys currently: 2');

        thresholdKey.add(key3.publicKey);

        expect(() => thresholdKey.toProtoKey()).not.toThrow();
    });
});

describe("generateMnemonic()", () => {
    it('produces a 24-word mnemonic', () => {
        const mnemonic = generateMnemonic();
        expect(mnemonic.mnemonic.split(' ')).toHaveLength(24);
    });

    it('produces a recoverable private key', async () => {
        const mnemonic = generateMnemonic();

        const key1 = await mnemonic.generateKey();
        const key2 = await Ed25519PrivateKey.fromMnemonic(mnemonic.mnemonic);
        expect(key1.toBytes()).toStrictEqual(key2.toBytes());
    });
});
